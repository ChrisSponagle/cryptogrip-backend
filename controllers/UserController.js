/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle users methods.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
const {sendVerificationEmail} = require("../services/EmailService");
const {createEthAccount} = require("../services/Web3Service");
const {getRandomPassphrases} = require("../services/PassphraseService");

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

  // Send verification code for email
  sendVerificationEmail({oUser});

  // Create new Eth account
  var oAccount = createEthAccount();
  oUser.address = oAccount.address;
  oUser.privateKey = oAccount.privateKey

  // Generate passphrase list for user
  const oPassphrases = getRandomPassphrases(); 
  var sPassphrases = oPassphrases.indexes.join(' ');
  oUser.passphrase = sPassphrases;

  // Save new user
  oUser.save()
    .then(function(){
      return res.json({
        success: true,
        user: oUser.toAuthJSON()
      });
    })
    .catch(next);
}

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