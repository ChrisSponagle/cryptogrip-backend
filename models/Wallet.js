/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Wallet schema

	Version: 2019
	Author: Cobee kwon
	Email: cobee.kwon@keysupreme.com
	Subject: Incodium Wallet API
	Date: 03/2019
*********************************************************/

const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        index: true
    },
    type: {
        type: String,
        default: ""
    },
    privateKey: {
        type: String,
        default: ""
    },
    publicKey: {
        type: String,
        default: ""
    },
}, {timestamps: true})

WalletSchema.methods.toJSON = function()
{
    return {
      type: this.type,  
      address: this.publicKey,
    };
};


mongoose.model('Wallet', WalletSchema);
