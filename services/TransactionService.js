/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate Transactions functions
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
    Date: 11/04/2019
*********************************************************/

const TransactionService = 
{ 
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

module.exports = TransactionService; 