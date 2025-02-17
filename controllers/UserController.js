/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle users methods.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
  Date: 05/12/2018
  Updated: 03/2019 | Cobee Kwon
*********************************************************/

const mongoose = require('mongoose');
const User = mongoose.model('User');
const Wallet = mongoose.model('Wallet');
const Recovery = mongoose.model('Recovery');
const passport = require('passport');
const crypto = require('crypto');
const {sendVerificationEmail, sendRecoveryEmail} = require("../services/EmailService");
const {createEthAccount} = require("../services/Web3Service");
const {createBtcAccount} = require("../services/BTCService");
const {getRandomPassphrases, getPassphrase, checkPassphrase} = require("../services/PassphraseService");
const {isFullyAuthenticated} = require("../services/AuthenticationService");
const {getVerificationEmailModel} = require("./EmailController");
// const {generateToken} = require("../services/RecoveryService");
const flash = require('express-flash');

/**
 * Register new user account
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.createAccount = function(req, res, next)
{
  // Get values from request
  var username = req.body.username || req.query.username;
  var email = req.body.email || req.query.email;
  var password = req.body.password || req.query.password;
  
  // Validate input values
  var aErrors = checkMandatoryFields({email, username, password});
  if( Object.keys(aErrors).length ){
    return res.json({
      success: false,
      errors: aErrors
    })
    .status(422);
  }

  email = email.toLowerCase().trim();

  var oUser = new User();
  oUser.username = username;
  oUser.email = email;
  oUser.setPassword(password);

  // Save new user
  oUser.save()
    .then(async function()
    {
      // Send verification code for email
      sendVerificationEmail({oUser});

      // Create new Wallet Account
      let nBtcWallet = await createBtcAccount();
      let oBtcWallet = await new Wallet({
        user: oUser._id,
        type: 'BTC',
        privateKey: nBtcWallet.privateKey,
        publicKey: nBtcWallet.address,
      });
      
      oBtcWallet.save();

      let nEthWallet = createEthAccount();
      let oEthWallet = new Wallet({
        user: oUser._id,
        type: 'ETH',
        privateKey: nEthWallet.privateKey,
        publicKey: nEthWallet.address
      });

      oEthWallet.save();


      // Generate passphrase list for user
      const oPassphrases = getRandomPassphrases(); 
      var sPassphrases = oPassphrases.indexes.join(' ');
      oUser.passphrase = sPassphrases;
      oUser.save();

      return res.json({
        success: true,
        user: oUser.toAuthJSON(),
        btc_wallet_address: oBtcWallet.toJSON(),
        eth_wallet_address: oEthWallet.toJSON()
      });
    })
    .catch(next);
}

/**
 * Login user with the API
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
exports.loginUser = function(req, res, next)
{
  // Get values from request
  var username = req.body.username || req.query.username;
  var password = req.body.password || req.query.password;

  if(!username)
  {
    return res.status(422).json({errors: {username: "can't be blank"}});
  }

  if(!password)
  {
    return res.status(422).json({errors: {password: "can't be blank"}});
  }

  passport.authenticate('local', {session: false}, function(err, oUser, info)
  {
    if(err){ return next(err); }

    if(oUser)
    {
      // Send verification code for email
      sendVerificationEmail({oUser});

      // Returns JWT token
      oUser.token = oUser.generateJWT();
      res.json({user: oUser.toAuthJSON()});
      oUser.verified = false;
      oUser.save();
      return;
    } 
    else {
      return res.status(422).json(info);
    }
  })(req, res, next);
}

/**
 * Verify if email code and passphrase are correct and mark user as fully 
 *  authenticated.
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
exports.verifyUser = function(req, res, next)
{
  // Get values from request
  const code = req.body.code || req.query.code;
  const inputPassphrase = req.body.passphrase || req.query.passphrase;
  const sUserId = req.payload.id;

  if( !code ){
    return res.json({
      success: false,
      errors: {code: "field is required."}
    })
    .status(400);
  }

  if(!inputPassphrase){
    return res.json({
      success: false,
      errors: {passphrase: "field is required."}
    })
    .status(400);
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

      // Get verification email model
      const pVerificationEmail = getVerificationEmailModel({user, code});
      pVerificationEmail
      .then(function(verificationEmail)
      {
          // At this point we have User object and Verification Email object.
          // it is time to start checking the data

          // Check verification code 
          if( !verificationEmail ){
            return res.json({
              success: false,
              errors: {message: "Verification Code is not valid"}
            });
          }
          
          // Check passphrase
          if( !checkPassphrase(user.passphrase, inputPassphrase) ) 
          {
            return res.json({
              success: false,
              errors: {message: "Passphrase is not valid"}
            });
          }
          
          // If we get here, code is correct and passphrase is correct
          // Great, we can verify user
          user.verified = true;
          user.save();

          res.json({
            success: true,
          });

          verificationEmail.verified = true;
          verificationEmail.save()

          return true;
      });
    });
}

/**
 * Get user's passphrase
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.getPassPhrase = function(req, res, next)
{
  // Get values from request
  var sUserId = req.payload.id;

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
      
      var aPassPhrase = getPassphrase(user.passphrase);

      return res.json({
          success: true,
          passphrase: aPassPhrase.join(" ")
        });
    });
}

/**
 * Update user's password
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.updatePassword = function(req, res, next)
{
  const password = req.body.password || req.query.password;
  const newPassword = req.body.new_password || req.query.new_password;
  const sUserId = req.payload.id;

  if( !password ){
    return res.json({
      success: false,
      errors: {password: "field is required."}
    })
    .status(400);
  }

  if( !newPassword ){
    return res.json({
      success: false,
      errors: {new_password: "field is required."}
    })
    .status(400);
  }

  User.findById(sUserId)
    .then(function(user)
    {
        if( !user )
        {
          return res.json({
            success: false,
            errors: {message: "User not found"}
          });
        }

        // Confim user is fully authenticated
        if( !isFullyAuthenticated({user, res}) ){
          return false;
        }

        if( user.validPassword(password) )
        {
            user.setPassword(newPassword);
            user.save();
            return res.json({
              success: true,
            });
        }
        else{
          return res.json({
            success: false,
            errors: {message: "Password is not valid"}
          });
        }
    });
}

/**
 * Update user's email
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.updateEmail = function(req, res, next)
{
  const newEmail = req.body.email || req.query.email;
  const sUserId = req.payload.id;

  if( !newEmail ){
    return res.json({
      success: false,
      errors: {email: "field is required."}
    })
    .status(400);
  }

  User.findById(sUserId)
    .then(function(user)
    {
        if( !user )
        {
          return res.json({
            success: false,
            errors: {message: "User not found"}
          });
        }

        // Confim user is fully authenticated
        if( !isFullyAuthenticated({user, res}) ){
          return false;
        }

        const oUser = user;
        
        // Send verification code for new email
        sendVerificationEmail({oUser, newEmail}); 

        return res.json({
          success: true,
        });
    });
}

/**
 * TODO: Remove after Incodium event
 * Get list of accounts created ordered by creation date desc
 */
// exports.getAccounts = function(req, res, next)
// {
//   User.find({}, null, {sort: '-createdAt'}, function(err, docs) { 
//     var aAccounts = [];
//     docs.forEach( account => {
//       var oAccount = {};
//       oAccount.wallet = account.address;
//       oAccount.createdAt = account.createdAt;
//       aAccounts.push(oAccount);
//     });
//     res.json(aAccounts);
//   });
// }

/**
 * Check if mandatory fields are present on request or not.
 * 
 * @param {username, email, password}
 * @returns Object
*/
const checkMandatoryFields = function({username, email, password})
{
  var aErors = {};

  if( !username ){
    aErors.username = "can not be blank";
  }
  if ( !email){
    aErors.email = "can not be blank";
  }
  if( !password ){
    aErors.password = "can not be blank";
  }

  return aErors;
}

/**
 * Check if email field is present on request or not.
 * 
 * @param {email}
 * @returns Object
*/
const checkEmailField = function({email})
{
  var aErors = {};

  if ( !email ){
    aErors.email = "can not be blank";
  }

  return aErors;
}

/**
 * Request an code to reset password
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.forgetPassword = (req, res, next) => 
{
  let sEmail = req.body.email || req.query.email;

  if( !sEmail ){
    return res.json({
      success: false,
      errors: {email: "field is required."}
    })
    .status(400);
  }

  User.findOne({ email: sEmail }, (err, user) => 
  {
    if (!user) 
    {
      return res.json({
        error: "Account not found."
      });
    }

    try{
      crypto.randomBytes(20, async (err, buf) => {
        const token = buf.toString('hex');

        // Create new recovery token
        const requestUser = new Recovery({
          userId: user._id,
          email: user.email,
          resetPasswordToken: token,
          resetPasswordExpires: Date.now() + 3600000  // expires in 1 hour
        });

        await requestUser.save();

        const sEmail = requestUser.email;
        const sToken = requestUser.resetPasswordToken;

        await sendRecoveryEmail({sEmail, sToken});

        return res.json({
          success: true,
        });
      })
    }
    catch( err )
    {
      console.error("Error when creating reset password token.");
      console.log(err);
      
      res.status(500)
      .json({
        sucess: false,
        error: "Some error happened."
      })
      .redirect('/recovery');
    };
  });
},


/**
 * Forget Password Verification Link Email
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.forgetPasswordVerify = async (req, res) => 
{
  let sToken = req.params.token;
  let resetPassword = req.body.new_password || req.query.new_password;
  let resetPasswordCheck = req.body.new_password_confirm || req.query.new_password_confirm;

  if(!sToken){
    return res.json({
      success: false,
      error: "Token parameter is mandatory"
    });
  }

  if( !resetPassword || !resetPasswordCheck)
  {
    return res.json({
      success: false,
      error: "Password and Password Confirmation parameters are mandatory"
    });
  }

  if( resetPassword !== resetPasswordCheck)
  {
    return res.json({
      success: false,
      error: "Passwords parameters do not match."
    });
  }

  Recovery.findOne({
    resetPasswordToken: sToken, 
    resetPasswordExpires: { $gt: Date.now() },
    used: false
  }, (err, oRecovery) => {
    if (oRecovery) 
    {
      User.findById(oRecovery.userId)
      .then(oUser => 
        {
          oUser.setPassword(resetPassword);
          oUser.save();

          oRecovery.used = true;
          oRecovery.save();
          
          return res.json({
            success: true,
            message: "Password has been changed successfully!"
          });
      })
      .catch(err => {
        return res.json({
          success: false,
          error: "Some error happened."
        });
      })
    } else {
      return res.redirect('/recovery');
    }
  });
  
}

