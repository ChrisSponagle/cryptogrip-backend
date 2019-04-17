/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle transactions to Etherium network methods.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
  Date: 07/12/2018
  Updated: 03/2019 | Cobee Kwon
*********************************************************/

const mongoose = require('mongoose');
const User = mongoose.model('User');
const Wallet = mongoose.model('Wallet');
const {isFullyAuthenticated} = require("../services/AuthenticationService");
const {
  getTransactions
} = require("../services/TransactionHistoryService");
const {
  getETHBalance,
  getBTCBalance,
} = require("../services/BalanceService");
const {checkERC20Coin} = require("../services/CryptoParser");
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
  let aErrors = checkSendMandatoryFields({coin, amount, wallet});
  if( Object.keys(aErrors).length ){
    return res.json({
      success: false,
      errors: aErrors
    })
    .status(422);
  }

  User.findById(sUserId)
    .then(async function(user)
    {
      // If user is not found, just return false
      if( !user )
      {
        return res.json({
          success: false,
          errors: {message: "User not found"}
        }).status(422);
      }

      // Check if coin is an ERC20 coin, 
      // if it is, use ETH wallet address
      let sWalletCoin = coin.toUpperCase();
      if( checkERC20Coin(sWalletCoin) ){
        sWalletCoin = "ETH";
      }

      Wallet.findOne({ user: sUserId, type: sWalletCoin })
        .then(senderWallet => {
          // If there is no wallet for this coin
          if(!senderWallet){
            return res.json({
              success: false,
              errors: {message: "Can't find wallet for this coin."}
            }).status(422);
          }
          // Check if transfer is for the same wallet
          else if( (senderWallet.publicKey || senderWallet.publicKey.toLowerCase()) == (wallet || wallet.toLowerCase()) )
          {
            return res.json({
              success: false,
              errors: {message: "Can not send coin to same address"}
            }).status(422);
          }
          else{
            const pSendCoin = sendCoin({user, wallet, amount, coin, senderWallet}, res);
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
          }
        })
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
  let sSymbol = req.body.coin || req.query.coin || null;

  User.findById(sUserId)
  .then(async function(user)
  {

    if(!user)
    {
      return res.json({
        success: false,
        errors: {message: "No user found."}
      });
    }

    // Confim user is fully authenticated
    if( !isFullyAuthenticated({user, res}) )
    {
      return false;
    }

    // TODO: Should check on database coins that user has and get all of them
    Promise.all([getETHBalance(sUserId, sSymbol), getBTCBalance(sUserId, sSymbol)])
    .then( (aResults) => 
    { 
      
      /// Remove null elements
      aResults = aResults.filter(function (el) {
        return el != null;
      });

      console.log(aResults);
      let aBalances = aResults.reduce((a, b) => [...a, ...b], []);

      return res.json({
        "success": true,
        "balance": aBalances
      });
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
exports.getUserTransactionsHistory = async function(req, res, next)
{
    // Get values from request
    const sUserId = req.payload.id;
    let sSymbol = req.body.coin || req.query.coin || null;

    User.findById(sUserId)
    .then(async function(user)
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

      let aUserWallets = null;

      if( !sSymbol )
      {
        aUserWallets = await Wallet.find({user: sUserId});
      }
      else{
        sSymbol = sSymbol.toUpperCase();

        // Check if coin request is ERC20 or not
        if( checkERC20Coin(sSymbol) )
        {
          aUserWallets = await Wallet.find({user: sUserId, type: "ETH"});
        }
        else{
          aUserWallets = await Wallet.find({user: sUserId, type: sSymbol});
        }
      }

      // Get transactions already parsed
      let pParsedTransactions = await getTransactions(aUserWallets, sSymbol);
      return res.json({success: true,
                        transactions: pParsedTransactions});
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