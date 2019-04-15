let http = require('http'),
    path = require('path'),
    methods = require('methods'),
    errorhandler = require('errorhandler'),
    mongoose = require('mongoose'),
    dotenv = require("dotenv").config({ path: "./config/.env" }),
    crypto = require('crypto');
    flash = require('express-flash');



var isProduction = process.env.PRODUCTION == 1;

mongoose.set('useCreateIndex', true);
if(isProduction){
  mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true });
} 
else {
  // Test DB address
  mongoose.connect('mongodb://localhost/ether_wallet', { useNewUrlParser: true });
  mongoose.set('debug', true);
}

require('../models/User');
require('../models/Wallet');
require('../models/Transaction');

const {createBtcAccount} = require("../services/BTCService");

const User = mongoose.model("User");
const Wallet = mongoose.model("Wallet");

let aPromises = [];

User.find()
.then( (aUsers) => {
    aUsers.forEach( async (oUser) => {
        console.log(oUser);
        if(oUser.privateKey)
        {
            // Create new Wallet Account
            let nBtcWallet = await createBtcAccount();
            
            let oBtcWallet = await new Wallet({
                user: oUser._id,
                type: 'BTC',
                privateKey: nBtcWallet.privateKey,
                publicKey: nBtcWallet.address,
            });
            
            oBtcWallet.save();

            // Parse ETH wallet
            let oEthWallet = await new Wallet({
                user: oUser._id,
                type: 'ETH',
                privateKey: oUser.privateKey,
                publicKey: oUser.address,
            });
            
            oEthWallet.save();

            // oUser.privateKey = undefined;
            // oUser.address = undefined;

            // oUser.save();
        }
    });

});


console.log("Migrate");


