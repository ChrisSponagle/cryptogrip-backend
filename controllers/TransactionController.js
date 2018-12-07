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
const {getTransactionsByAccount} = require("../services/TransactionHistoryService");

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
      var pParsedTransactions = getTransactionsByAccount(user.address);
      pParsedTransactions.then(function(transactions){
        return res.json({"success": true,
                        "transactions": transactions});  
      });
    });
}