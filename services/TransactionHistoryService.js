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
const axios = require("axios");
const Transaction = mongoose.model('Transaction');
const ETHERSCAN_URL = process.env.ETHERSCAN_API;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
const INCO_CONTRACT = process.env.INCO_TOKEN;
const {getETHCoinName} = require("./CryptoParser");

// Prepare URLs to be called
const ETH_URL = ETHERSCAN_URL+"?module=account&action=txlist&startblock=0&endblock=99999999&sort=desc&apikey="+ETHERSCAN_KEY+"&address=";
const INCO_URL = ETHERSCAN_URL+"?module=account&action=tokentx&contractaddress="+INCO_CONTRACT+"&page=1&offset=100&sort=desc&apikey="+ETHERSCAN_KEY+"&address=";

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
			 case "ETH":
				 aPromises.push(TransactionHistoryService.getETHTransactions(aAccount.publicKey, sSymbol));
				 break;
			
			 // Get BTC transactions
			}
		}

		return Promise.all(aPromises)
			.then( function(aTransactions)
			{
				return aTransactions.reduce((a, b) => [...a, ...b], []);
			});		
	},

	/**
	 * 
	 * @param {*} accountNo 
	 * @param {*} sSymbol 
	 */
	getETHTransactions: async function(accountNo, sSymbol)
	{
		console.log("GET ETH transactions")
		return TransactionHistoryService.getTransactionsFromEtherScanByAccount(accountNo, sSymbol)
			.then(function(transactions)
			{
				if( !transactions )
				{
					console.log("No Transactions, try DB");
					return TransactionHistoryService.getTransactionsFromDbByAccount(accountNo, sSymbol);
				}
				else{
					return transactions;
				}
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

			  let aParsetTransactions = TransactionHistoryService.parseETHTransactions(transactions);
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
		accountNo = accountNo.toLowerCase();

		let sSymbolQuery = null;
		if(sSymbol){
			sSymbolQuery = {symbol: sSymbol}
		}

		return Transaction
		.find(sSymbolQuery)
		.or([{to: accountNo},  {from:accountNo} ])
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
	
	/**
	 * Parse transactions from EtherScan to a way that the
	 * 	front-end will understand
	 * @param {Array} transactions 
	 */
	parseETHTransactions: function(transactions)
	{
		let aTransactions = [];
		let aSaveTransactions = [];

		transactions
		// Sort elements in desc order
		.sort(function(a, b) {
			return b.timeStamp - a.timeStamp;
		}).
		// Create new elements
		forEach(element => 
		{
			let oTransaction = new Transaction();

			oTransaction.txHash = element.hash.toLowerCase();
			oTransaction.from = element.from.toLowerCase();
  		oTransaction.to = element.to.toLowerCase();
  		oTransaction.value = element.value;
  		oTransaction.blockNumber = element.blockNumber;
  		oTransaction.gas = element.gas;
			oTransaction.gasPrice = element.gasPrice;
			oTransaction.timestamp = element.timeStamp;
			
			if(element.contractAddress != "")
			{
				oTransaction.contractAddress = element.contractAddress.toLowerCase();
			}

			oTransaction.symbol = getETHCoinName(element);
			
			aSaveTransactions.push(oTransaction);
			aTransactions.push(oTransaction.toJSON());
		});

		// Save transactions on Mongo asynchronously 
		TransactionHistoryService.saveTransactions(aSaveTransactions);

		// Return parsed transactions
		return aTransactions;
	},

	/**
	 * Save list of transactions on database
	 * 
	 * @param {Array} transactions 
	 */
	saveTransactions: async function(transactions)
	{
		transactions.forEach(element => {
			element.save(function(err){
				if(err){
					console.log("Element already saved");
					console.log(element);
				}
			});
		});
	}
}

module.exports = TransactionHistoryService; 