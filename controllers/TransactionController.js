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
const {getBalanceFromEtherScanByAccount, getBalanceFromBlockChain} = require("../services/BalanceService");
const {sendCoin} = require("../services/Web3Service");

/**
 * Get balance of user's account
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
exports.sendCoin = function(req, res, next)
{
  // Get values from request
  const sUserId = req.payload.id;
  const coin = req.body.coin || req.query.coin;
  const amount = req.body.amount || req.query.amount;
  const wallet = req.body.wallet || req.query.wallet;

  // Validate input values
  var aErrors = checkSendMandatoryFields({coin, amount, wallet});
  if( Object.keys(aErrors).length ){
    return res.json({
      success: false,
      errors: aErrors
    })
    .status(422);
  }

  User.findById(sUserId)
    .then(function(user)
    {
      // If user is not found, just return false
      if( !user )
      {
        return res.json({
          success: false,
          errors: {message: "User not found"}
        }).status(422);
      }

      if( user.address.toLowerCase() == wallet.toLowerCase() )
      {
        return res.json({
          success: false,
          errors: {message: "Can not send coin to same address"}
        }).status(422);
      }
      
      const pSendCoin = sendCoin({user, coin, wallet, amount}, res);
      pSendCoin
      .then(function(err){
        if(err && err.errors)
        {
          return res.json({
            success: false,
            errors: err.errors
          });
        }
      });

    });
}

/**
 * Get balance of user's account
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
exports.getUserBalance = function(req, res, next)
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
        errors: {message: "No user found."}
      });
    }

    // Confim user is fully authenticated
    if( !isFullyAuthenticated({user, res}) ){
      return false;
    }

     // Get transactions already parsed
     var pParsedBalance = getBalanceFromEtherScanByAccount(user.address);
     pParsedBalance.then(function(balances)
     {
       // If it is not possible to get balance from EtherScan get it from blockchain
       //TODO: Get balance from blockchain
      //  if( !balances )
      //  {
         
      //   pParsedBalance = getBalanceFromBlockChain(user.address);
      //   pParsedBalance.then(function(blockChainBalance)
      //    {
      //      return res.json({"success": true,
      //                       "balance": blockChainBalance});
      //    });
      //  }
      //  else{
           return res.json({"success": true,
                            "balance": balances});  
      //  }
     });
    
  });
}

/**
 * Get transaction history of user account
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
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
          errors: {message: "No user found."}
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
          pParsedDbTransactions = getTransactionsFromDbByAccount(user.address);
          pParsedDbTransactions.then(function(dbTransactions)
          {
            return res.json({success: true,
                             transactions: dbTransactions});
          });
        }
        else{
            return res.json({success: true,
                             transactions: transactions});  
        }
      });
    });
}


/**
 * Check if mandatory fields are present on request or not.
 * 
 * @param {coin, value, wallet}
 * @returns Object
*/
const checkSendMandatoryFields = function({coin, amount, wallet})
{
  var aErors = {};

  if( !coin ){
    aErors.coin = "can not be blank";
  }
  if ( !amount){
    aErors.amount = "can not be blank";
  }
  if( !wallet ){
    aErors.wallet = "can not be blank";
  }

  return aErors;
}