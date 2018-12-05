/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Build verification email with given code.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/


const verificationEmail = 
{
    /**
     * Build email with verificaiton code
    */
    buildVerificationEmail: function({code, email})
    {
        const msg = {
            to: email,
            from: 'registration@incowallet.com',
            subject: 'Incowallet Verification Code',
            html: 'Please verify your account with this verification Code: <br/><strong>' + code + '</strong.',
        }

        return msg;
    }
};

module.exports = verificationEmail; 