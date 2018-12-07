/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle transactions to Etherium network methods.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 07/12/2018
*********************************************************/


const mongoose = require('mongoose');
const User = mongoose.model('User');
const {isFullyAuthenticated} = require("../services/AuthenticationService");
const {getTransactionsFromEtherScanByAccount, getTransactionsFromDbByAccount} = require("../services/TransactionHistoryService");

exports.getUserTransactionsHistory = function(req, res, next)
{
    // Get values from request
    const sUserId = req.payload.id;

    User.findById(sUserId)
    .then(function(user)
    {

      if(!user)
      {
        return res.json({
          success: false,
          passphrase: null
        });
      }

      // Confim user is fully authenticated
      if( !isFullyAuthenticated({user, res}) ){
        return false;
      }

      // Get transactions already parsed
      var pParsedTransactions = getTransactionsFromEtherScanByAccount(user.address);
      pParsedTransactions.then(function(transactions)
      {
        
        // If it is not possible to get transactions from EtherScan get it from our database
        if( !transactions )
        {
          console.log("No transactions");
          pParsedDbTransactions = getTransactionsFromDbByAccount(user.address);
          console.log(pParsedDbTransactions);
          pParsedDbTransactions.then(function(dbTransactions)
          {
            console.log(dbTransactions);
            return res.json({"success": true,
                             "transactions": dbTransactions});
          });
        }
        else{
            return res.json({"success": true,
                        "transactions": transactions});  
        }
        
      });
    });
}