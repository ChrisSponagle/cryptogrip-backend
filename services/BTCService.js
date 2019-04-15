/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate BTC requests
    
	Version: 2019
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
    Date: 08/04/2019
*********************************************************/

const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const axios = require("axios");
const BigNumber =  require('bignumber.js');
const {saveTransactions} = require("./TransactionService");
const {parseBtcValue} = require("./CryptoParser");

// Bitcoin lib
const bitcoin = require('bitcoinjs-lib');

let BTCNetWork;
let BTCPushtxNetwork;

if(process.env.BITCOIN_MAIN_NETWORK == 1){
	BTCNetWork = bitcoin.networks.bitcoin;
	BTCPushtxNetwork = require('blockchain.info/pushtx');
}
else{
	BTCNetWork = bitcoin.networks.testnet;
	BTCPushtxNetwork = require('blockchain.info/pushtx').usingNetwork(3);
}

// Fetch last transactions URL
const BLOCKCHAIN_INFO = process.env.BLOCKCHAIN_INFO_URL;
// Prepare URLs to be called
const BLOCKCHAIN_INFO_URL = BLOCKCHAIN_INFO+"/rawaddr/";

const BTCService = 
{ 
   /**
     * Create new Bitcoin account(wallet)
     * 
     * @return Account
     */
   createBtcAccount: async function()
   {
        // generate a SegWit address (via P2SH)
		let keyPair = bitcoin.ECPair.makeRandom({ network: BTCNetWork });
		let privateKey = keyPair.toWIF();
		let publicKey = keyPair.publicKey.toString('hex');
		let { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: BTCNetWork });
    
		let oAccount = { privateKey, address, publicKey }

		return oAccount;
   },

    /**
     * Send etherium coin to user's account
     * 
     * @param {user, wallet, amount} 
     * @param {*} res 
    */
   sendBtcCoin: async function({user, wallet, amount, senderWallet}, res)
   {
	   // Parse amount to send
		let fValueinSatoshis = new BigNumber(amount * 100000000); // BTC to Satoshi
		let fee = 12000;
		let fValueWithFee = fValueinSatoshis.plus(fee);

		// Get transactions to use and calculate total value of them
		let oTransactions = await BTCService.getRawTransactionsFromBlockInfoByAccount(senderWallet.publicKey, fValueWithFee);
		let aTransactionList = oTransactions.transactions;
		let fTotalValue = oTransactions.value;
		let fLeftValue = fTotalValue - fValueWithFee;
		
		// If there are no transactions it means the account has no funds for this transaction
		if(!aTransactionList)
		{
			return res.json({
				success: false,
				errors: {message: "Not enough funds."}
			});
		}

		let keyPair = await bitcoin.ECPair.fromWIF(senderWallet.privateKey, BTCNetWork);
				
		// Build BTC transaction
		let tx = new bitcoin.TransactionBuilder(BTCNetWork);
		tx.setVersion(1);

		// Build list of inputs
		for(let i = 0; i < aTransactionList.length; i++)
		{
			let aTransaction = aTransactionList[i];
			tx.addInput(aTransaction.hash, aTransaction.vout);
		}

		// Output to desired wallet
		tx.addOutput(wallet, fValueinSatoshis.toNumber());

		// Output remaining value to same wallet
		if(fLeftValue > 0)
		{
			tx.addOutput(senderWallet.publicKey, fLeftValue);
		}

		// Sign every input
		for(let i = 0; i < aTransactionList.length; i++)
		{
			tx.sign(i, keyPair);
		}

		const txv = tx.build().toHex();

		console.log("Broadcasting transaction: ");
		console.log("	Wallet: ", senderWallet.publicKey);
		console.log("	Transaciton Hex: " ,txv);
		
		BTCPushtxNetwork.pushtx(txv)
		.catch(err => {
			console.log(err);
			return res.json({
				success: false,
				errors: {message: "No possible to make transaction."}
			});
		});

		return res.json({
			success: true,
			errors: {message: "Success."}
		});
   },

   	/**
	 * Get transactions that will be used to send money from the user's account
	 * 
	 * @param {String} accountNo
	 * @param {float} fValue
	 */
	getRawTransactionsFromBlockInfoByAccount: async function(accountNo, fValue)
	{
		console.log(fValue);
		// Get the last 500 transactions fot this account
		let sBtcInfo = BLOCKCHAIN_INFO_URL+accountNo+"?limit=500";
		console.log("   URL: ", sBtcInfo);

		return axios.get(sBtcInfo)
		.then( (oResult) => 
		{	
			if(oResult.data.final_balance < fValue)
			{
				console.error("Not enough funds.");
				return null;
			}

			let aTransactions = oResult.data.txs;
			let aTransactionsToUse = [];
			let fSumValue = 0;
			let iNoTransactions = aTransactions.length;

			// Goes from oldest one to newest one to use the oldest transactions first
			for(let i = iNoTransactions; i >= 0; i--)
			{	
				if( fValue.isLessThan(fSumValue) )
				{
					console.log("Already enoguh funds");
					break;
				}

				let oTransaction = aTransactions[i];

				if( !oTransaction )
				{
					continue;
				}

				let aOutputs = oTransaction.out;

				aOutputs.forEach( (oOutput) => {
					if(oOutput.spent == false && oOutput.addr == accountNo)
					{
						oTransaction.vout = oOutput.n;
						aTransactionsToUse.push(oTransaction);
						fSumValue = fSumValue + oOutput.value;
					}
				});
			}
			
			return { transactions: aTransactionsToUse, value: fSumValue };
		})
		.catch((e) => {
			console.log("Not possible to get BTC transactions from Blockchain Info.");
			console.log(e);
			return null;
		});
	},

    /**
	 * Parse transactions from Bitcoin Info to a way that the
	 * 	front-end will understand
	 * 
	 * @param {Array} transactions 
	 * @param {String} sAccount
	 */
   parseBtcTransaction: function(oTransactions, sAccount)
	{
		let aTransactions = [];
		let aSaveTransactions = [];

		let aRawTransactions = oTransactions.txs;

		aRawTransactions
		// Create new elements
		.forEach(element => 
		{
			let oNewTransaction = new Transaction();

			oNewTransaction.txHash = element.hash;
			oNewTransaction.from = BTCService.getBtcTransactionFrom(element, sAccount);
			oNewTransaction.to = BTCService.getBtcTransactionTo(element, sAccount, oNewTransaction.from);
			oNewTransaction.blockNumber = element.block_height;
			oNewTransaction.timestamp = element.time;
			oNewTransaction.symbol = "BTC";
			oNewTransaction.value = BTCService.getBtcTransactionValue(element, sAccount, oNewTransaction);
			oNewTransaction.gas = BTCService.getBtcTransactionFee(element);
			// BTC is not like ETH that has gas and gas price, so our gas price is always 0
			oNewTransaction.gasPrice = 0;
			
			aSaveTransactions.push(oNewTransaction);
			aTransactions.push(oNewTransaction.toJSON());
		});

		// Save transactions on Mongo asynchronously 
		saveTransactions(aSaveTransactions);

		return aTransactions;
	},

	/**
	 * Get account that orinated transfer
	 * 
	 * @param {Object} oTransaction 
	 * @param {String} sAccount 
	 */
	getBtcTransactionFrom: function(oTransaction, sAccount)
	{
		let oInputs = oTransaction.inputs;
		let sFromAddress = null;

		oInputs.forEach( (element) => 
		{
			let sInputAddr = element.prev_out.addr;

			if(sInputAddr){
				if(sInputAddr == sAccount)
				{
					sFromAddress = sAccount;
					return;
				}else{
					sFromAddress = sInputAddr;
					return;
				}
			}
		});

		return sFromAddress;
	},

	/**
	 * Get destination account of transfer
	 * 
	 * @param {*} oTransaction 
	 * @param {*} sAccount 
	 * @param {*} sFromAccount 
	 */
	getBtcTransactionTo: function(oTransaction, sAccount, sFromAccount)
	{
		let oOutputs = oTransaction.out;
		let sToAddress = null;

		// If the from account is not this account, it means it is the receiver
		if(sAccount != sFromAccount){
			return sAccount;
		}

		oOutputs.forEach( (element) => 
		{
			let sOutAddr = element.addr;

			if(sOutAddr){
				if(sOutAddr == sAccount)
				{
					sToAddress = sAccount;
					return;
				}
			}
		});

		return sToAddress;
    },
    
	/**
	 * Calculate transaction fee.
	 *  Formula: https://bitcoin.stackexchange.com/questions/13360/how-are-transaction-fees-calculated-in-raw-transactions
	 * 
	 * @param {Object} oTransaction 
	 */
	getBtcTransactionFee: function(oTransaction)
	{
		let oInputs = oTransaction.inputs;
		let oOutputs = oTransaction.out;

		let iInputValue = 0;
		let iOutputValue = 0;

		oInputs.forEach( (element) => 
		{
			let iElementInputValue = element.prev_out.value;

			if(iElementInputValue){
				iInputValue += iElementInputValue;
			}
		});

		oOutputs.forEach( (element) => 
		{
			let iElementOutputValue = element.value;

			if(iElementOutputValue){
				iOutputValue += iElementOutputValue;
			}
		});

		return iInputValue - iOutputValue;
	},

	/**
	 * 
	 * @param {Object} oTransaction 
	 * @param {String} sAccount 
	 * @param {Transaction} oNewTransaction 
	 */
	getBtcTransactionValue: function(oTransaction, sAccount, oNewTransaction)
	{
		if(oNewTransaction.to == sAccount)	{
			return BTCService.getBtcTransactionValueReceived(oTransaction, sAccount);
		}

		return BTCService.getBtcTransactionValueSent(oTransaction, sAccount);
	},

	/**
	 * Get value of transaction when the account was the sender
	 * 
	 * @param {Object} oTransaction 
	 * @param {String} sAccount 
	 */
	getBtcTransactionValueSent: function(oTransaction, sAccount)
	{
		let oInputs = oTransaction.inputs;
		let iValue = 0;

		oInputs.forEach( (element) => 
		{
			let sInputAddr = element.prev_out.addr;
			let iInputValue = element.prev_out.value;

			if(sInputAddr){
				if(sInputAddr == sAccount)
				{
					iValue = iInputValue;
					return;
				}
			}
		});

		return iValue;
	},

	/**
	 * Get value of transaction when the account was the receiver
	 * 
	 * @param {Object} oTransaction 
	 * @param {String} sAccount 
	 */
	getBtcTransactionValueReceived: function(oTransaction, sAccount)
	{
		let oInputs = oTransaction.out;
		let iValue = 0;

		oInputs.forEach( (element) => 
		{
			let sInputAddr = element.addr;
			let iInputValue = element.value;

			if(sInputAddr){
				if(sInputAddr == sAccount)
				{
					iValue = iInputValue;
					return;
				}
			}
		});

		return iValue;
	},
}

module.exports = BTCService; 