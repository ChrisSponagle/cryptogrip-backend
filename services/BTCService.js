/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate BTC requests
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
    Date: 08/04/2019
*********************************************************/

const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const axios = require("axios");
const { getBalanceFromBlockchainInfoByAccount} = require("./BalanceService");

// Bitcoin lib
const bitcoin = require('bitcoinjs-lib');

let BTCNetWork;
if(process.env.BITCOIN_MAIN_NETWORK === 1){
    BTCNetWork = bitcoin.networks.bitcoin;
}else{
    BTCNetWork = bitcoin.networks.testnet;
}

const BLOCKCYPHER = process.env.BLOCKCYPHER;


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
   sendBtcCoin: async function({user, wallet, amount}, res)
   {
        // Create (and broadcast via 3PBP) a Transaction, w/ a P2SH(P2WPKH) input
        let senderWallet = await Wallet.findOne({ user: user, type: 'BTC' })
        let keyPair = await bitcoin.ECPair.fromWIF(senderWallet.privateKey, BTCNetWork);
        let p2wpkh = await bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network: BTCNetWork })
        let p2sh = await bitcoin.payments.p2sh({ redeem: p2wpkh, network: BTCNetWork })

        // Building Transaction(To Send)
        let txb = new bitcoin.TransactionBuilder(BTCNetWork);

        // Find out the Total amount | amount to Keep
        let Balance = await getBalanceFromBlockchainInfoByAccount(senderWallet.publicKey)
        let txid = Balance.txid; // hash of previous transaction
        let oIndex = Balance.oIndex;   // previous transaction input's index of sender address
        let totalBalance = await parseInt((Balance.balance * 100000000).toFixed(0));
        let amountToSend = await parseInt((amount * 100000000).toFixed(0));
        let fee = 100000
        let leftOver = totalBalance - amountToSend - fee
        console.log("Total amount / sent / left over ===> " + totalBalance + ' / ' + amountToSend + ' / ' + typeof(leftOver));
        
        // Sending Coin
        txb.addInput(txid, oIndex);
        txb.addOutput(wallet, amountToSend);     // send to recepient
        txb.addOutput(senderWallet.publicKey, leftOver);    // left over bitcoin should be a fee

        try {
            txb.sign(0, keyPair, p2sh.redeem.output, null, totalBalance);
            let txhex = txb.build().toHex();
            console.log(txhex)
            
            await axios({
                method: 'post',
                url: BLOCKCYPHER+'/txs/push',
                data: {
                  "tx": txhex
                }
            })
            .then(result => {
                console.log( result)
                return JSON.parse(result)
            })
            .catch(error => {
                console.log(" ERR(after .then) =====> " + error)
            })
        } catch(err) {
            console.log("ERR(try_catch) is =====> " + err)
        }
   },

   parseBtcTransaction: function(oTransactions, sAccount)
	{
			let aTransactions = [];
			let aSaveTransactions = [];

			let aRawTransactions = oTransactions.txs;

			aRawTransactions
			// Sort elements in desc order
			.sort(function(a, b) {
				return b.time - a.time;
			}).
			// Create new elements
			forEach(element => 
			{
				let oNewTransaction = new Transaction();
	
				oNewTransaction.txHash = element.hash;
				oNewTransaction.from = BTCService.getBtcTransactionFrom(element, sAccount);
				oNewTransaction.to = BTCService.getBtcTransactionTo(element, sAccount, oNewTransaction.from);
				oNewTransaction.blockNumber = element.block_height;
				oNewTransaction.timestamp = element.time;
				oNewTransaction.symbol = "BTC";
				oNewTransaction.value = BTCService.getBtcTransactionValue(element, sAccount);
				oNewTransaction.gas = BTCService.getBtcTransactionFee(element);
				
				aSaveTransactions.push(oNewTransaction);
				// aTransactions.push(oNewTransaction.toJSON());
				aTransactions.push(oNewTransaction);
			});

			return aTransactions;
	},

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
    
	// https://bitcoin.stackexchange.com/questions/13360/how-are-transaction-fees-calculated-in-raw-transactions
	getBtcTransactionFee: function(oTransaction)
	{
		return 1;
	},

	getBtcTransactionValue: function(oTransaction, sAccount)
	{
		return 1;
	},
}

module.exports = BTCService; 