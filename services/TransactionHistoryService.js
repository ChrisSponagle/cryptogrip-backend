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

    getTransactionsByAccount: async function (accountNo) 
    {
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
			  console.log(e);
		  });
	},
	
	parseTransactions: function(transactions)
	{
		var aTransactions = [];
		var aSaveTransactions = [];

		transactions
		// Sort elements in desc order
		.sort(function(a, b) {
			return a.timeStamp - b.timeStamp;
		}).
		// Create new elements
		forEach(element => 
		{
			var oTransaction = new Transaction();

			oTransaction.txHash = element.hash;
			oTransaction.from = element.from;
  			oTransaction.to = element.to;
  			oTransaction.value = element.value;
  			oTransaction.blockNumber = element.blockNumber;
  			oTransaction.gas = element.gas;
			oTransaction.gasPrice = element.gasPrice;
			oTransaction.timestamp = element.timeStamp;
			
			if(element.contractAddress != ""){
				oTransaction.contractAddress = element.contractAddress;
			}
			
			aSaveTransactions.push(oTransaction);
			aTransactions.push(oTransaction.toJSON());
		});
		TransactionHistoryService.saveTransactions(aSaveTransactions);
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