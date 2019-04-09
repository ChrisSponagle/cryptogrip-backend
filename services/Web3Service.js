/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate Web3 requests
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
    Date: 05/12/2018
    Updated: 03/2019 | Cobee Kwon
*********************************************************/

const stripHexPrefix = require('strip-hex-prefix');
const BigNumber =  require('bignumber.js');
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const EthUtil = require('ethereumjs-util');
const mongoose = require('mongoose');
const Wallet = mongoose.model('Wallet');
const Transaction = mongoose.model('Transaction')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));
const ABI = require("../util/abi.json");
const gasPriceGlobal = new BigNumber(450000);

const {sendBtcCoin} = require("./BTCService");

// TODO: Later this information should come dinamically from database
const INCO_CONTRACT = process.env.INCO_TOKEN;
const ETH_TOKEN = "ETH";
const INCO_TOKEN = "INCO";
const INCO_DECIMALS = process.env.INCO_DECIMALS;
const BTC_TOKEN = "BTC";


const Web3Service = 
{   


    /**
     * Create new Etherium account(wallet)
     * @return Account
     */
    createEthAccount: function(){
        var account = web3.eth.accounts.create();
        return account;
    },

    /**
     * Define which coin to send to user
     * 
     * @param {user, wallet, amount, coin} 
     * @param {*} res 
     */
    sendCoin: function({user, wallet, amount, coin}, res)
    {
        switch(coin.toUpperCase())
        {
            case ETH_TOKEN: {
                return Web3Service.sendEthCoin({user, wallet, amount}, res);
                break;
            }
            case INCO_TOKEN: {
                return Web3Service.sendIncoCoin({user, wallet, amount}, res);
                break;
            }
            case BTC_TOKEN: {
                return sendBtcCoin({user, wallet, amount}, res);
                break;
            }

            default:
                return null;
        }
    },

    /**
     * Send etherium coin to user's account
     * 
     * @param {user, wallet, amount} 
     * @param {*} res 
    */
    sendIncoCoin: async function({user, wallet, amount}, res)
    {
        let senderWallet = await Wallet.findOne({ user: user, type: 'ETH' })
        const privateKeyStr = stripHexPrefix(senderWallet.privateKey);
        const privateKey = Buffer.from(privateKeyStr, 'hex');
        
        let bPublicKey = senderWallet.publicKey

        let contract_buf = new web3.eth.Contract(ABI, INCO_CONTRACT);
        let amountFee = (web3.utils.toWei(amount.toString())).toString();

        let nonce = null;
        let txData = null;

        // Prepare contract to be used
        try{
            txData = contract_buf.methods
            .transfer(wallet, "" + amountFee)
            .encodeABI();

            nonce = await web3.eth
            .getTransactionCount(bPublicKey)
            .catch(error => {
                return 'Error occurred in getting transaction count!';
            });
        }catch(err){
            console.log("Invalid wallet address: ", bPublicKey);
            return {errors: {message : "Wallet address is invalid."}};
        }
        
        // Get gas price
        let gasPriceWeb3 = await web3.eth.getGasPrice();
        let gasPrice = new BigNumber(gasPriceGlobal);
        
        // Calculate amount in Ether value
        let calculatedAmount = amount * (10 ** INCO_DECIMALS);

        if ( gasPrice.isLessThan(gasPriceWeb3) )
        {
            gasPrice = gasPriceWeb3;
        } 
        
        // Prepare transaction data for contract
        let txParams = {
            nonce: web3.utils.toHex(nonce),
            from: bPublicKey,
            to: contract_buf._address,
            gasPrice: web3.utils.toHex(gasPrice),
            gasLimit: web3.utils.toHex(450000),
            value: '0x00',
            data: txData,
        };

        let tx = null;
        try{
            tx = new Tx(txParams);
        }catch(err){
            console.log(err);
            return {errors: {message : "Destination wallet address is invalid."}};
        }
        
        // Sign transaction with private key, so it is valid for the blockchain
        tx.sign(EthUtil.toBuffer(privateKey));

        let serializedTx = tx.serialize();

        web3.eth
            // Try to place transaction
            .sendSignedTransaction(`0x${serializedTx.toString('hex')}`)
            .on('transactionHash', function(hash){
                res.json({
                    success: true,
                    transaction: hash
                });
                return true;
            })
            // Transaction worked
            .on('receipt', receipt => 
            {
                if(receipt && receipt.status)
                {
                    var oTransaction = new Transaction();
                    oTransaction.txHash = receipt.transactionHash;
                    oTransaction.from = receipt.from;
                    oTransaction.to = receipt.to;
                    oTransaction.value = calculatedAmount;
                    oTransaction.blockNumber = receipt.blockNumber;
                    oTransaction.gas = receipt.gasUsed;
                    oTransaction.gasPrice = receipt.cumulativeGasUsed;
                    // Time
                    var date = new Date();
                    // Save timestamp without miliseconds
                    oTransaction.timestamp = Math.floor(date.getTime()/1000);
                    if(receipt.contractAddress){
                        oTransaction.contractAddress = receipt.contractAddress;
                    }

                    oTransaction.save();
                    return true;
                }

                return false;
            })
            // Some error happened, probably not enough money
            .on('error', err => {
                console.log("Error when sending coin: ", err);
                if(err)
                {
                    return res.json({
                        success: false,
                        errors: {message: "Not enough funds."}
                    });
                }                
                return err;
            });  
    },

    /**
     * Send etherium coin to user's account
     * 
     * @param {user, wallet, amount} 
     * @param {*} res 
     */
    sendEthCoin: async function({user, wallet, amount}, res)
    {
        let senderWallet = await Wallet.findOne({ user: user, type: 'ETH' })
        const privateKeyStr = stripHexPrefix(senderWallet.privateKey);
        const privateKey = Buffer.from(privateKeyStr, 'hex');
        
        let bPublicKey = senderWallet.publicKey

        let nonce = null;
        
        try{
            nonce = await web3.eth
            .getTransactionCount(bPublicKey)
            .catch(error => {
                console.log(nonce)
                return res.json({
                    error: 'Error occurred in getting transaction count!',
                })
            });
        } catch(err){
            console.log("Invalid wallet address: ", bPublicKey);
            return res.json({
               errors: {
                   message : "Wallet address is invalid."
               } 
            })
        }
        
        // Get gas price
        let gasPriceWeb3 = await web3.eth.getGasPrice();
        let gasPrice = new BigNumber(gasPriceGlobal);
        
        // Calculate amount in Ether value
        let calculatedAmount = amount * (10 ** 18);

        if ( gasPrice.isLessThan(gasPriceWeb3) )
        {
            gasPrice = gasPriceWeb3;
        } 
        
        // Prepare transaction data
        let txParams = {
            nonce: web3.utils.toHex(nonce),
            from: bPublicKey,
            to: wallet,
            gasPrice: web3.utils.toHex(gasPrice),
            gasLimit: web3.utils.toHex(450000),
            value: web3.utils.toHex(calculatedAmount),
        };

        let tx = null;
        try{
            tx = await new Tx(txParams);
        } catch(err){
            console.log(err);
            return res.json({
                errors: {message : "Destination wallet address is invalid."}
            }) 
        }
        
        // Sign transaction with private key, so it is valid for the blockchain
        tx.sign(EthUtil.toBuffer(privateKey));

        let serializedTx = tx.serialize();

        web3.eth
            // Try to place transaction
            .sendSignedTransaction(`0x${serializedTx.toString('hex')}`)
            .on('transactionHash', function(hash){
                res.json({
                    success: true,
                    transaction: hash
                });
                return true;
            })

            // Transaction worked
            .on('receipt', receipt => 
            {
                if(receipt && receipt.status)
                {
                    var oTransaction = new Transaction();
                    oTransaction.txHash = receipt.transactionHash;
                    oTransaction.from = receipt.from;
                    oTransaction.to = receipt.to;
                    oTransaction.value = calculatedAmount;
                    oTransaction.blockNumber = receipt.blockNumber;
                    oTransaction.gas = receipt.gasUsed;
                    oTransaction.gasPrice = receipt.cumulativeGasUsed;
                    // Time
                    var date = new Date();
                    // Save timestamp without miliseconds
                    oTransaction.timestamp = Math.floor(date.getTime()/1000);
                    if(receipt.contractAddress){
                        oTransaction.contractAddress = receipt.contractAddress;
                    }

                    oTransaction.save();
                    return true;
                }

                return false;
            })
            // Some error happened, probably not enough money
            .on('error', err => {
                console.log("Error when sending ETH: ", err);
                if(err)
                {
                    return res.json({
                        success: false,
                        errors: {message: "Not enough funds."}
                    });
                }                
                return err;
            });  
    },

    //TODO: Get balance from blockchian based on contract address and account address
    getAccountBalance: function(accountNo, contractAddress = null)
    {
        accountNo = accountNo.toLowerCase();
        web3.eth.getBalance(accountNo)
        .then(console.log);
    },

    // TODO: Use this function on Micro-service to keep database updated with latest transactions
    // of wallet's users
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