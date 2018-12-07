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

// Prepare URLs to be called
const ETH_URL = ETHERSCAN_URL+"?module=account&action=txlist&startblock=0&endblock=99999999&sort=desc&apikey="+ETHERSCAN_KEY+"&address=";
const INCO_URL = ETHERSCAN_URL+"?module=account&action=tokentx&contractaddress="+INCO_CONTRACT+"&page=1&offset=100&sort=desc&apikey="+ETHERSCAN_KEY+"&address=";

const TransactionHistoryService = 
{   
	/**
	 * Get transactions of account on EtherScanIo
	 * 
	 * @param {String} accountNo 
	 */
    getTransactionsFromEtherScanByAccount: async function (accountNo) 
    {
		// Parse account to lower case
		accountNo = accountNo.toLowerCase();

        return axios.all([
			axios.get(ETH_URL+accountNo),
			axios.get(INCO_URL+accountNo)
		  ])
		  .then(axios.spread((ethRes, incoRes) => {
			  const ethData = ethRes.data;
			  const incoData = incoRes.data;
			  var transactions = [];

			  if(ethData.status == 1)
			  {
				transactions = [...transactions,
							   ...ethData.result]	
			  }

			  if(incoData.status == 1)
			  {
				transactions = [...transactions,
								...incoData.result]	
			  }

			  var aParsetTransactions = TransactionHistoryService.parseTransactions(transactions);
			  return aParsetTransactions;
		  }))
		  .catch(function(e){
			  console.log("Not possible to get transactions from EtherScan");
			  console.log(e);
			  return null;
		  });
	},

	/**
	 * Get transactions from database
	 * 
	 * @param {String} accountNo 
	 */
	getTransactionsFromDbByAccount: function(accountNo)
	{
		// Parse account to lower case
		accountNo = accountNo.toLowerCase();

		return Transaction
		.find()
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
	parseTransactions: function(transactions)
	{
		var aTransactions = [];
		var aSaveTransactions = [];

		transactions
		// Sort elements in desc order
		.sort(function(a, b) {
			return b.timeStamp - a.timeStamp;
		}).
		// Create new elements
		forEach(element => 
		{
			var oTransaction = new Transaction();

			oTransaction.txHash = element.hash.toLowerCase();
			oTransaction.from = element.from.toLowerCase();
  			oTransaction.to = element.to.toLowerCase();
  			oTransaction.value = element.value;
  			oTransaction.blockNumber = element.blockNumber;
  			oTransaction.gas = element.gas;
			oTransaction.gasPrice = element.gasPrice;
			oTransaction.timestamp = element.timeStamp;
			
			if(element.contractAddress != ""){
				oTransaction.contractAddress = element.contractAddress.toLowerCase();
			}
			
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