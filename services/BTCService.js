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
const {saveTransactions} = require("./TransactionService");

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

//Broadcast URL
// const BLOCKCYPHER = process.env.BLOCKCYPHER;
// Fetch latest transaction URL
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
		console.log(senderWallet.privateKey);
		let keyPair = await bitcoin.ECPair.fromWIF(senderWallet.privateKey, BTCNetWork);
		
		console.log("    PrivateKey:", keyPair.privateKey.toString('hex'));
		console.log("    PublicKey:", keyPair.publicKey.toString('hex'));

		let tx = new bitcoin.TransactionBuilder(BTCNetWork);

		tx.setVersion(1);
		tx.addInput("1f73f5aa139dc813f5c8b7e0c3d90c5b1dc147af009c16344cc87008ee6fb9ad", 1);
		tx.addInput("eda753494a927c2e1b0c54226f89e03ca2f9ac26311dae6c61824f00e1d6d855", 1);
		tx.addOutput("2N2MfFPDPnGnPxynRC8qkKCpp2bc9o4L7u3", 1950000);
		tx.sign(0, keyPair);
		tx.sign(1, keyPair);

		const txv = tx.build().toHex();

		console.log(txv);

		
		BTCPushtxNetwork.pushtx(txv)
		.catch(err => {
			console.log(err);
		});
   },

   	/**
	 * 
	 */
	getLastTransactionFromBlockInfoByAccount: async function(accountNo)
	{
		let sBtcInfo = BLOCKCHAIN_INFO_URL+accountNo+"?limit=1";
		console.log("   URL: ", sBtcInfo);

		return axios.get(sBtcInfo)
		.then( (oResult) => 
		{	
			console.log(oResult);
			let aTransactions = oResult.data.txs;
			if(aTransactions)
			{
				aTransactions[0].final_balance = oResult.data.final_balance;
				return aTransactions[0];
			}

			return null;
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