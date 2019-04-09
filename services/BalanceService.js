/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate functions to retrieve user's balance
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 08/12/2018
	Updated: 03/2019 | Cobee Kwon
*********************************************************/

const mongoose = require('mongoose');
const Wallet = mongoose.model('Wallet');
const axios = require("axios");
const ETHERSCAN_URL = process.env.ETHERSCAN_API;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
const INCO_CONTRACT = process.env.INCO_TOKEN;
const BLOCKCHAIN_INFO_URL = process.env.BLOCKCHAIN_INFO_URL;
const {parseValue, getCoinName} = require("../services/CryptoParser");
const {getAccountBalance} = require("./Web3Service");

// Prepare URLs to be called
const ETH_URL = ETHERSCAN_URL+"?module=account&action=balance&tag=latest&apikey="+ETHERSCAN_KEY+"&address=";
const INCO_URL = ETHERSCAN_URL+"?module=account&action=tokenbalance&contractaddress="+INCO_CONTRACT+"&apikey="+ETHERSCAN_KEY+"&tag=latest&address=";
const BTC_URL = BLOCKCHAIN_INFO_URL+"/q/addressbalance/";

const BalanceService = 
{  
	/**
	 * 
	 * @param {*} iUserId 
	 */
	getETHBalance: async function(iUserId)
    {
        return Wallet.findOne({ user: iUserId, type: 'ETH' })
          .then(res => {
            let pParsedBalance = BalanceService.getBalanceFromEtherScanByAccount(res.publicKey);
            return pParsedBalance
          })
          .then(balances => {
            return balances
          })
          .catch(err => {
            console.error("Error retrieving ETH balance: ", err);
          });
	},

	/**
	 * 
	 * @param {*} iUserId 
	 */
	getBTCBalance: async function(iUserId)
    {
        return Wallet.findOne({ user: iUserId, type: 'BTC' })
			.then(res => {
				let pParsedBalance = BalanceService.getBalanceFromBlockchainInfoByAccount(res.publicKey);
				return pParsedBalance
			})
			.then(balances => {
				return balances
			})
			.catch(err => {
				console.error("Error retrieving BTC balance: ", err);
			});
	},

    /**
	 * Get balances of account on EtherScanIo
	 * 
	 * @param {String} accountNo 
	 */
    getBalanceFromEtherScanByAccount : async function (accountNo) 
    {
        // Parse account to lower case
		accountNo = accountNo.toLowerCase();

		console.log("Getting ETH balance: ");
		console.log("    URL: ", ETH_URL+accountNo);

		console.log("Getting INCO balance: ");
		console.log("    URL: ", INCO_URL+accountNo);

        return axios.all([
			axios.get(ETH_URL+accountNo),
			axios.get(INCO_URL+accountNo)
		  ])
		  .then(axios.spread((ethRes, incoRes) => {
              let ethData = ethRes.data;
              ethData.contractAddress =  null;
              let incoData = incoRes.data;

              incoData.contractAddress = INCO_CONTRACT;
              let aBalances = [ethData, incoData];

              let aParsedBalances = BalanceService.parseBalance(aBalances);
			  return aParsedBalances;
		  }))
		  .catch(function(e){
			  console.error("Not possible to get balance from EtherScan");
			  console.error(e);
			  return null;
		  });
	},
	
	/**
	 * Get balance of Bitcoin Account
	 * 
	 * @param {String} accountNo 
	 */
    getBalanceFromBlockchainInfoByAccount : async function (accountNo) 
    {
		let addressCall = BTC_URL+accountNo+"?confirmations=6";

		console.log("Getting BTC balance: ");
		console.log("    URL: " + addressCall);

		return await axios.get(addressCall)
		.then(oResult => 
			{
			let aBTCBalances = [];
			let iBalance = oResult.data;
			// Satoshi to BTC
			let fBalance = parseFloat((iBalance * 0.00000001).toFixed(8))	

			let aBTCData = {
				coin: "BTC",
				balance: fBalance,
			}

			aBTCBalances.push(aBTCData);
			return aBTCBalances;
		})
		.catch(err => {
			console.error("Get balance error:", err);
			return err;
		});
	},

	// TODO: Get balance from blockchain
	// this function will be used when EtherScan fails
    getBalanceFromBlockChain : async function (accountNo) 
    {

    },

    /**
	 * Parse balance from EtherScan to a way that the
	 * 	front-end will understand
	 * @param {Array} balances 
	 */
	parseBalance: function(balances)
	{
		let aBalances = [];

		balances
		// Create new elements
		.forEach(balance => 
		{
			let balanceValue = parseValue(balance, balance.result);

			if(isNaN(balanceValue))
			{
                balanceValue = 0;
            }
            
            oBalance = {
                coin: getCoinName(balance),
                balance: balanceValue
            }
			
			aBalances.push(oBalance);
		});

		// Return parsed balances
		return aBalances;
	},
}

module.exports = BalanceService; 