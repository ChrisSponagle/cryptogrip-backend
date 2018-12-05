/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle users methods.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorranpego@gmail.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');

/**
 * Register new user account
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
const createAccount = 
exports.createAccount = function(req, res, next)
{
  // Get values from request
  var username = req.body.username || req.query.username;
  var email = req.body.email || req.query.email;
  var password = req.body.password || req.query.password;
  
  var user = new User();

  user.username = username;
  user.email = email;
  user.setPassword(password);

  user.save().then(function(){
    return res.json({user: user.toAuthJSON()});
  }).catch(next);
}