
/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Verification Email schema

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

var mongoose = require('mongoose');

var VerificationEmailSchema = new mongoose.Schema({
  code: {type: String, index: true},
  user:  {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  verified: {type: Boolean, default: false} 
}, {timestamps: true});

mongoose.model('VerificationEmail', VerificationEmailSchema);
