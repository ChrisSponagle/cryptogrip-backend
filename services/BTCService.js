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
const regtestUtils = require("./regtest");
var bigi    = require("bigi");
var buffer  = require('buffer');

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
   createBtcAccount: async function(){
        // generate a SegWit address (via P2SH)
        
        let privateKey = bitcoin.ECPair.makeRandom({ network: BTCNetWork }).toWIF();
        
        let keyPair = await bitcoin.ECPair.fromWIF(privateKey, BTCNetWork);
        let { address } = await bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: BTCNetWork}),
            network: BTCNetWork
        })
    
        let pass = { privateKey, address }
        return pass;
   },

    /**
     * Send etherium coin to user's account
     * 
     * @param {user, wallet, amount} 
     * @param {*} res 
    */
   sendBtcCoin: async function({user, wallet, amount, senderWallet}, res)
   {
	

		const keyPair = bitcoin.ECPair.fromWIF(senderWallet.privateKey, BTCNetWork);
		const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: BTCNetWork })
		// console.log(keyPair);
		// console.log("Public key: " , keyPair.publicKey);
		// const p2pkh = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: BTCNetWork })
		// const p2pk = bitcoin.payments.p2pk({ pubkey: keyPair.publicKey, network: BTCNetWork });
		// console.log("P2pk: " , p2pk);
		// const p2wsh = bitcoin.payments.p2wsh({ redeem: p2pk, network: BTCNetWork });
		// console.log(p2wsh);
		// console.log(p2wsh.address);
		// console.log(p2wsh.output);
		// console.log(p2wsh.input);
		// let amountToSend = parseInt((amount * 100000000).toFixed(0));
		const unspent = await regtestUtils.faucet("2My3gStGq1tEpwzQadfpLqhsMNpexajnWz6", 5e4);

		console.log(unspent);

		// console.log(unspent);
		// let fee = parseInt((0.00001 * 100000000).toFixed(0));
		// XXX: build the Transaction w/ a P2WSH input
		const txb = new bitcoin.TransactionBuilder(BTCNetWork)
		txb.addInput(unspent.txId, unspent.vout, null, p2pkh.output) // NOTE: provide the prevOutScript!
		txb.addOutput(wallet, 2e4)
		txb.sign(0, keyPair) // NOTE: provide a witnessScript!
		const tx = txb.build()

		// console.log(tx.toHex());
		// build and broadcast (the P2WSH transaction) to the Bitcoin RegTest network
		// await regtestUtils.broadcast(tx.toHex())

		console.log(BTCPushtxNetwork);
		BTCPushtxNetwork.pushtx(tx.toHex())
		.catch(err => {
			console.log(err);
		});

		await regtestUtils.verify({
			txId: tx.getId(),
			address: wallet,
			vout: 0,
			value: 2e4
		})

        // let keyPair = await bitcoin.ECPair.fromWIF(senderWallet.privateKey, BTCNetWork);
        // let p2wpkh = await bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: BTCNetWork })
        // let p2sh = await bitcoin.payments.p2sh({ redeem: p2wpkh, network: BTCNetWork })

        // // Building Transaction(To Send)
        // let txb = new bitcoin.TransactionBuilder(BTCNetWork);

        // // Find out the Total amount | amount to Keep
		// let oLastTransaction = await BTCService.getLastTransactionFromBlockInfoByAccount(senderWallet.publicKey);
		// let txid = oLastTransaction.hash; // hash of previous transaction
        // let oIndex = oLastTransaction.tx_index; //oLastTransaction.inputs[0].prev_out.tx_index;   // previous transaction input's index of sender address
        // let totalBalance = oLastTransaction.final_balance; //parseInt((oLastTransaction.final_balance * 100000000).toFixed(0));
        
        // let fee = 100000;
		// let leftOver = totalBalance - amountToSend - fee;
		
		// console.log("keyPair: ", keyPair);
		// console.log("p2wpkh: ", p2wpkh);
		// console.log("p2sh: ", p2sh);
		// console.log("txid: ", txid);
		// console.log("oIndex: ", oIndex);
		// console.log("Total Balance: ", totalBalance);
		// console.log("Amount to send:", amountToSend);
		// console.log("Left: ", leftOver);
        
        // // Sending Coin
        // txb.addInput(txid, oIndex);
        // txb.addOutput(wallet, amountToSend);     // send to recepient
        // txb.addOutput(senderWallet.publicKey, leftOver);    // left over bitcoin should be a fee

        // // try {
        //     txb.sign(0, keyPair, p2sh.redeem.output, null, totalBalance);
		// 	let txhex = txb.build().toHex();

		// 	console.log(txhex);
			
		// 	BTCPushtxNetwork.pushtx(txhex, null)
			// .catch(err => {
			// 	console.log(err);
			// });
  
        // } catch(err) {
        //     console.log("ERR(try_catch) is =====> " + err)
        // }
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