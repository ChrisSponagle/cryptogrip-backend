/*********************************************************
 *******************    Information    *******************
 *********************************************************

	User schema

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/12/2018
*********************************************************/

const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const jwt = require('jsonwebtoken');
const secret = require('../config').secret;
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: {type: String, unique: true, required: [true, "can not be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
  email: {type: String, lowercase: true, unique: true, required: [true, "can not be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
  password: {
    type: String,
    default: ""
  },
  verified: {
    type: Boolean,
    default: false,
  },
  passphrase: {
    type: String,
    default: ''
  },
  isDeleted: {
      type: Boolean,
      default: false
  },
  address:{
      type: String,
      default: ''
  },
  privateKey: {
    type: String,
    default: ''
  }
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

UserSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.setPassword = function(password){
  this.password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

UserSchema.methods.generateJWT = function() {
  var today = new Date();
  var exp = new Date(today);
  // JWT expires in 1 hour
  var hour = 3600000;
  exp.setTime(today.getTime() + hour); 

  return jwt.sign({
    id: this._id,
    username: this.username,
    exp: parseInt(exp.getTime() / 1000),
  }, secret);
};

UserSchema.methods.toAuthJSON = function(){
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    wallet_address: this.address
  };
};

UserSchema.methods.toProfileJSONFor = function(user){
  return {
    username: this.username,
    wallet_address: this.address
  };
};

mongoose.model('User', UserSchema);
