/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate Web3 requests
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));

const Web3Service = 
{   
    /**
     * Create new Etherium account
     * 
     * @return Account
     */
    createEthAccount: function(){
        var account = web3.eth.accounts.create();
        return account;
    }
}

module.exports = Web3Service; 