/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate Passphrase functions
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

const passphrase = require("../util/passphrase.json");
const noWords = parseInt(process.env.PASSPHRASE_LENGTH) || 3;

const PassPhraseService = 
{   
    /**
     * Get list of user's passphrase
     * 
     * @param {String} sIndexes - Indexes of user's passphrases
     * @return {Array} - Array with user's passphrase
     */
    getPassphrase: function(sIndexes)
    {
        var aIndexes = sIndexes.split(" ");
        var aPassphrase = []
        aIndexes.forEach(index => {
            aPassphrase.push(passphrase[index]);
        });

        return aPassphrase;
    },

    /**
     * Check if passphrase inputed by user is the same saved on database.
     * 
     * @param {String} passphrase - User's prassphrase
     * @param {String} inputPassphrase - Passphrase inputed by user
     * @returns {Boolean} True: Same passphrase | Faklse: Not the same
     */
    checkPassphrase: function(userPassphrase, inputPassphrase)
    {
        const aIndexes = userPassphrase.split(" ");
        const aInputPassPhrase = inputPassphrase.toLowerCase().split(" ");
        var count = 0;
        var bValidWords = true;

        aIndexes.forEach(index => {
            // Get passphrase from list
            var sWord = passphrase[index];

            // Compare with passprase entered by user
            if(sWord !== aInputPassPhrase[count]){
                bValidWords = false;
            }
            count++;
        });

        return bValidWords;
    },

    /**
     * Get a list of random words and its indexes from passphrase file
     */
    getRandomPassphrases: function() 
    {
        var aPassPhrase = new Array(noWords);
        var aIndexes = new Array(noWords);
        var n = noWords;
        var len = passphrase.length;
        var taken = new Array(len);

        while (n--) {
            var x = Math.floor(Math.random() * len);
            aPassPhrase[n] = passphrase[x in taken ? taken[x] : x];
            aIndexes[n] = x;
            taken[x] = --len in taken ? taken[len] : len;
        }
        
        var aDuple =  {
            "words": aPassPhrase,
            "indexes": aIndexes
        };

        return aDuple;
    }
}

module.exports = PassPhraseService; 