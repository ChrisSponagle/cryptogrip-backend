/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Transaction schema

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 07/12/2018
*********************************************************/

const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const {parseValue, checkERC20Coin} = require("../services/CryptoParser");
const ETHERSCAN_URL = process.env.ETHERSCAN_URL;

const TransactionSchema = new mongoose.Schema({
  txHash: { type: String, required: [true, "can not be blank"], index: true} ,
  from: { type: String, required: [true, "can not be blank"], index: true },
  to: { type: String, required: [true, "can not be blank"], index: true },
  value: { type: String, required: [true, "can not be blank"], },
  blockNumber: { type: String, required: [true, "can not be blank"], },
  gas: { type: String, required: [true, "can not be blank"], },
  gasPrice: { type: String, default: '' },
  contractAddress: { type: String, default: null, index: true } ,
  symbol: { type: String, index: true } ,
  timestamp: { type: String, default: '' },
}, {timestamps: true});

TransactionSchema.index({ txHash: 1, contractAddress: 1 }, { unique: true });

TransactionSchema.plugin(uniqueValidator, {message: 'already exists.'});

TransactionSchema.methods.toJSON = function(transaction){
  return {
    txHash: this.txHash,
    details: this.getURL(this),//ETHERSCAN_URL+"/tx/"+this.txHash,
    from: this.from,
    to: this.to,
    value: parseValue(this, this.value),
    blockNumber: this.blockNumber,
    gas: parseValue(this, this.gas),
    gasPrice: parseValue(this, this.gasPrice),
    time: this.timestamp,
    symbol: this.symbol,
  };
};

TransactionSchema.methods.getURL = function(transaction){
  if( checkERC20Coin(this.symbol) ){
    return ETHERSCAN_URL+"/tx/"+this.txHash;
  }
  else{
    //TODO: Return correct address for BTC transaction
  }
}

mongoose.model('Transaction', TransactionSchema);
