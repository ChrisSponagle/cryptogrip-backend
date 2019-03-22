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

const axios = require("axios");
const ETHERSCAN_URL = process.env.ETHERSCAN_API;
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY;
const INCO_CONTRACT = process.env.INCO_TOKEN;
const BLOCKCHAIN_URL = process.env.BLOCKCHAIN_URL;
const {parseValue, getCoinName} = require("../services/CryptoParser");
const {getAccountBalance} = require("./Web3Service");

// Prepare URLs to be called
const ETH_URL = ETHERSCAN_URL+"?module=account&action=balance&tag=latest&apikey="+ETHERSCAN_KEY+"&address=";
const INCO_URL = ETHERSCAN_URL+"?module=account&action=tokenbalance&contractaddress="+INCO_CONTRACT+"&apikey="+ETHERSCAN_KEY+"&tag=latest&address=";
const BTC_URL = BLOCKCHAIN_URL

const BalanceService = 
{  
    /**
	 * Get balances of account on EtherScanIo
	 * 
	 * @param {String} accountNo 
	 */
    getBalanceFromEtherScanByAccount : async function (accountNo) 
    {
        // Parse account to lower case
		accountNo = accountNo.toLowerCase();

        return axios.all([
			axios.get(ETH_URL+accountNo),
			axios.get(INCO_URL+accountNo)
		  ])
		  .then(axios.spread((ethRes, incoRes) => {
              const ethData = ethRes.data;
              ethData.contractAddress =  null;
              const incoData = incoRes.data;

              incoData.contractAddress = INCO_CONTRACT;
              var aBalances = [ethData, incoData];

              var aParsedBalances = BalanceService.parseBalance(aBalances);
			  return aParsedBalances;
		  }))
		  .catch(function(e){
			  console.log("Not possible to get balance from EtherScan");
			  console.log(e);
			  return null;
		  });
	},
	
	/**
	 * Get balances of account on Bitcoin
	 * 
	 * @param {String} accountNo 
	 */
    getBalanceFromBlockchainByAccount : async function (accountNo) 
    {
		return axios.all([
			axios.get(BTC_URL + accountNo)
		])
		.then(res => {
			let keyValues = Object.values(res[0].data)
			// console.log("(result)>>>>>>>> " + keyValues[0].final_balance)

			// satoshi to BTC
			let btcBalance = keyValues[0].final_balance * 0.00000001;
			console.log("btc_ballance=======> " + btcBalance);
			let btcData = {
				coin: "BTC",
				balance: btcBalance
			}
			return btcData
		})
		.catch(err => {
			console.log("error===> " + err)
			return null
		})
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
		var aBalances = [];

		balances
		// Create new elements
		.forEach(balance => 
		{
            var balanceValue = parseValue(balance, balance.result);
            if(isNaN(balanceValue)){
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