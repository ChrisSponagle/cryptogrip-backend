/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle email verification and re-sending methods.

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
var VerificationEmailModel = mongoose.model('VerificationEmail');
const {sendVerificationEmail} = require("../services/EmailService");