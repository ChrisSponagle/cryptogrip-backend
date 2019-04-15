/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate Transactions functions
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 07/12/2018
*********************************************************/

const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const axios = require("axios");
const ETHERSCAN_URL = process.env.ETHERSCAN_API;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
const INCO_CONTRACT = process.env.INCO_TOKEN;
const BLOCKCHAIN_INFO = process.env.BLOCKCHAIN_INFO_URL;

const {parseBtcTransaction} = require("./BTCService");
const {parseEthTransactions} = require("./Web3Service");

// Prepare URLs to be called
const ETH_URL = ETHERSCAN_URL+"?module=account&action=txlist&startblock=0&endblock=99999999&sort=desc&apikey="+ETHERSCAN_KEY+"&address=";
const INCO_URL = ETHERSCAN_URL+"?module=account&action=tokentx&contractaddress="+INCO_CONTRACT+"&page=1&offset=100&sort=desc&apikey="+ETHERSCAN_KEY+"&address=";
const BLOCKCHAIN_INFO_URL = BLOCKCHAIN_INFO+"/rawaddr/";

const TransactionHistoryService = 
{   

	/**
	 * Get transactions for list of accounts
	 * 
	 * @param {array} aAccounts 
	 */
	getTransactions: function(aAccounts, sSymbol)
	{

		let aPromises = [];
		for(let i = 0; i < aAccounts.length; i++)
		{
			let aAccount = aAccounts[i];
			switch(aAccount.type)
			{
			 // GET ETH based coins
			 case "ETH":
				 aPromises.push(TransactionHistoryService.getETHTransactions(aAccount.publicKey, sSymbol));
				 break;
			
			 // Get BTC based transactions
			 case "BTC":
				aPromises.push(TransactionHistoryService.getBTCTransactions(aAccount.publicKey, sSymbol));
				break;
			}
		}

		return Promise.all(aPromises)
			.then( function(aTransactions)
			{
				return aTransactions.reduce((a, b) => [...a, ...b], [])
					// Sort elemetns by timestamp after merging everything
					.sort(function(a, b) {
						return b.timeStamp - a.timeStamp;
					});
			});		
	},

	/**
 	 * Get BTC transactions using BlockCypher API
	 * 
	 * @param {String} accountNo 
	 * @param {String} sSymbol 
	 */
	getBTCTransactions: async function(accountNo, sSymbol)
	{
		console.log("GET BTC transactions")
		return TransactionHistoryService.getTransactionsFromBlockInfoByAccount(accountNo, sSymbol)
			.then(function(transactions)
			{
				if( !transactions )
				{
					console.log("No Transactions, try DB for BTC");
					return TransactionHistoryService.getTransactionsFromDbByAccount(accountNo, sSymbol);
				}
				else{
					return transactions;
				}
			});
	},

	/**
	 * Get ETH transactions using EtherScan API
	 * 
	 * @param {String} accountNo 
	 * @param {String} sSymbol 
	 */
	getETHTransactions: async function(accountNo, sSymbol)
	{
		console.log("GET ETH transactions")
		return TransactionHistoryService.getTransactionsFromEtherScanByAccount(accountNo, sSymbol)
			.then(function(transactions)
			{
				if( !transactions )
				{
					console.log("No Transactions, try DB for ETH");
					return TransactionHistoryService.getTransactionsFromDbByAccount(accountNo, sSymbol);
				}
				else{
					return transactions;
				}
			});
	},

	/**
	 * 
	 */
	getTransactionsFromBlockInfoByAccount: async function(accountNo, sSymbol)
	{
		let sBtcInfo = BLOCKCHAIN_INFO_URL+accountNo;
		console.log("   URL: ", sBtcInfo);

		return axios.get(sBtcInfo)
		.then( (oResult) => 
		{
			let oTransactions = oResult.data;
			let aParsedTransactions = parseBtcTransaction(oTransactions, accountNo);
			return aParsedTransactions;
		})
		.catch((e) => {
			console.log("Not possible to get BTC transactions from Blockchain Info.");
			console.log(e);
			return null;
		});
	},

	/**
	 * Get transactions of account on EtherScanIo for ETH based accounts
	 * 
	 * @param {String} accountNo 
	 */
	getTransactionsFromEtherScanByAccount: async function (accountNo, sSymbol) 
    {
			// Parse account to lower case
			accountNo = accountNo.toLowerCase();

			let oETHCall = null;
			let oINCOCall =  null;

			// If not specific symbol is requested, gets everything
			if(!sSymbol)
			{
				oETHCall = axios.get(ETH_URL+accountNo);
				oINCOCall = axios.get(INCO_URL+accountNo);
			}
			else{
				switch(sSymbol){
					case "ETH":{
						oETHCall = axios.get(ETH_URL+accountNo);
						break;
					}
					case "INCO":{
						oINCOCall = axios.get(INCO_URL+accountNo);
						break;
					}

					default:
						break;
				}
			}
			
      return axios.all([
				oETHCall,
				oINCOCall
		  ])
			.then(axios.spread((ethRes, incoRes) => 
			{
			  const ethData = ethRes ? ethRes.data : null;
				const incoData = incoRes ? incoRes.data : null;

			  let transactions = [];

			  if(ethData && ethData.status == 1)
			  {
					transactions = [...transactions,
								   		   ...ethData.result]	
			  }

			  if(incoData && incoData.status == 1)
			  {
					transactions = [...transactions,
									 			  ...incoData.result]	
			  }

			  let aParsetTransactions = parseEthTransactions(transactions);
			  return aParsetTransactions;
		  }))
		  .catch(function(e){
			  console.error("Not possible to get transactions from EtherScan");
			  console.error(e.response.data);
			  return null;
		  });
	},

	/**
	 * Get transactions from database
	 * 
	 * @param {String} accountNo 
	 * @param {String} sSymbol
	 */
	getTransactionsFromDbByAccount: function(accountNo, sSymbol)
	{
		// Parse account to lower case
		let accountNoLower = accountNo.toLowerCase();

		let sSymbolQuery = null;
		if(sSymbol){
			sSymbolQuery = {symbol: sSymbol}
		}

		return Transaction
		.find(sSymbolQuery)
		.or([ {to: accountNoLower},  {from:accountNoLower}, {to: accountNo},  {from:accountNo} ])
		.sort({timestamp: -1})
		.then(transactions => {
				var aTransactions = [];

				transactions.forEach(element => {
					aTransactions.push(element.toJSON());
				});
				return aTransactions;
		})
		.catch(error => { 
			console.log("Error when trying to get transactions from DB: " + error) 
		});
	},
}

module.exports = TransactionHistoryService; 