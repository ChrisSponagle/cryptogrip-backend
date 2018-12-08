/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate Web3 requests
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/12/2018
*********************************************************/

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));


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
    },

    //TODO: Get balance from blockchian based on contract address and account address
    getAccountBalance: function(accountNo, contractAddress = null)
    {
        accountNo = accountNo.toLowerCase();
        web3.eth.getBalance(accountNo)
        .then(console.log);
    },

    getTransactionsFromBlockChain: async function (accountNo, startBlockNumber, endBlockNumber)
    {
        // const 
        // const latest = await web3.eth.getBlockNumber();
        // console.log("Lastest block:", latest);
        // console.log(web3.eth.blockNumber)
        // if (endBlockNumber == null) {
        //   endBlockNumber = web3.eth.blockNumber;
        //   console.log("Using endBlockNumber: " + endBlockNumber);
        // }
        // endBlockNumber = latest;
        // startBlockNumber = endBlockNumber-1000;
        // if (startBlockNumber == null) {
        //   startBlockNumber = endBlockNumber - 1000;
        //   console.log("Using startBlockNumber: " + startBlockNumber);
        // }
        // console.log("Searching for transactions to/from account \"" + accountNo + "\" within blocks "  + startBlockNumber + " and " + endBlockNumber);
        
        // for (var i = startBlockNumber; i <= endBlockNumber; i++) {
        //     if (i % 1000 == 0) {
        //     console.log("Searching block " + i);
        //     }
        //     var block = web3.eth.getBlock(i, true);
        //     block.then(function(block){
        //     if (block != null && block.transactions != null) 
        //     {
        //         block.transactions.forEach( function(e) 
        //         {
        //         if (accountNo == "*" || accountNo == e.from || accountNo == e.to) {
        //             console.log("  tx hash          : " + e.hash + "\n"
        //             + "   nonce           : " + e.nonce + "\n"
        //             + "   blockHash       : " + e.blockHash + "\n"
        //             + "   blockNumber     : " + e.blockNumber + "\n"
        //             + "   transactionIndex: " + e.transactionIndex + "\n"
        //             + "   from            : " + e.from + "\n" 
        //             + "   to              : " + e.to + "\n"
        //             + "   value           : " + e.value + "\n"
        //             + "   time            : " + block.timestamp + " " + new Date(block.timestamp * 1000).toGMTString() + "\n"
        //             + "   gasPrice        : " + e.gasPrice + "\n"
        //             + "   gas             : " + e.gas + "\n"
        //             + "   input           : " + e.input);
        //         }
        //         });
        //     }
        //     });
        // }
    },
}

module.exports = Web3Service; 