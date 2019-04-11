/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate functions to parse crypto currency
    and prepare its information for the front-end
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 07/12/2018
*********************************************************/

const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER));
const BigNumber =  require('bignumber.js');
const INCO_CONTRACT = process.env.INCO_TOKEN;
const INCO_DECIMALS = process.env.INCO_DECIMALS;

const CryptoParser = 
{   
    /**
     * Check if transaction is Etherium or not
     * 
     * @return Account
     */
    checkIsEth: function(transaction)
    {   
        if(!transaction){
            return null;
        }

        if(transaction.contractAddress && transaction.contractAddress == INCO_CONTRACT){
            return false;
        }

        return true;
    },

    /**
     * Get name of coin based on contract address
     * 
     * @param {String} contractAddress Address of contract
     */
    getETHCoinName: function({contractAddress})
    {
        if(contractAddress){
            contractAddress =  contractAddress.toLowerCase();
        }

        switch(contractAddress)
        {
            case INCO_CONTRACT.toLowerCase():
            {
                return "INCO";
            }

            default: {
                return "ETH";
            }
        }
    },

    /**
     * Parse value from blockchain into a redable value
     * 
     * @param {Transaction} transaction 
     * @param {String} value 
     */
    parseValue: function (transaction, value)
    {   
       if( CryptoParser.checkERC20Coin(transaction.symbol) )
       {
           return CryptoParser.parseEthValue(transaction, value);
       }
       else{
           return CryptoParser.parseBtcValue(value);
       }
    },

    /**
     * Parse value from BTC based coin into a redable value
     * 
     * @param {String} value 
     */
    parseBtcValue: function(value)
    {
        let oValue = new BigNumber(value* 0.00000001); // Satoshi to BTC
        return oValue.toFixed();
    },

    /**
     * Parse value from Etherium based coin into a redable value
     * 
     * @param {Transaction} transaction 
     * @param {String} value 
     */
    parseEthValue: function(transaction, value)
    {
        const web3BigNumber = new web3.utils.toBN(value);
        
        if(CryptoParser.checkIsEth(transaction))
        {
            return web3.utils.fromWei(web3BigNumber, 'ether').toString();
        }
    
        const valueBigNumber = new BigNumber(value);

        switch(transaction.contractAddress)
        {    
            case INCO_CONTRACT:
            {
                return valueBigNumber.dividedBy(Math.pow(10, INCO_DECIMALS)).toFixed();
            }

            default: {
                return valueBigNumber.dividedBy(Math.pow(10, 18)).toFixed();
            }
        }
    },

    /**
     * Check if a symbol is an Etherium Based symbol
     * 
     * @param {String} sSymbol 
     */
    checkERC20Coin: function(sSymbol)
    {
        //TODO: This check should be done against the database not with hardcoded values
        switch(sSymbol)
        {
            case "ETH":
            case "INCO":
                return true;
                break;
            
            default:
                return false;
        }
    },
}

module.exports = CryptoParser; 