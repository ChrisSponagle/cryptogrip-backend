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
var createAccount = 
exports.createAccount = function(req, res, next){
  var user = new User();

  user.username = req.body.user.username;
  user.email = req.body.user.email;
  user.setPassword(req.body.user.password);

  user.save().then(function(){
    return res.json({user: user.toAuthJSON()});
  }).catch(next);
}