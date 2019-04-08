/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Build recovery passsword email with given token.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 08/04/2019
*********************************************************/


const hostPath = process.env.INCOWALLET_URI;

const recoveryEmail = 
{
    /**
     * Build email with verificaiton code
    */
    buildRecoveryEmail: function({sEmail, sToken})
    {
        const msg = {
            to: sEmail,
            from: 'recovery@incowallet.com',
            subject: 'Incowallet Password Reset',
            html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.</br>' + 
            'Please click on the following link, or paste this into your browser to complete the process:<br><br>' +
            hostPath + '/reset/' + sToken + '<br><br>' +
            'If you did not request this, please ignore this email and your password will remain unchanged.<br><br>'
        };

        return msg;
    }
};

module.exports = recoveryEmail; 