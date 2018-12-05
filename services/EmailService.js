/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to encapsulate SendGrid requests
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

var verificationEmail = require("../emails/verificationEmail");
const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey('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');
sgMail.setApiKey(process.env.SENDGRID_KEY);

const EmailService = 
{   
    /**
     * Send verification email with new 
     * 
     * @param {String} email 
     */
    sendVerificationEmail: function(email)
    {
        var code = Math.floor(Math.random() * 90000) + 10000;       
        msg = verificationEmail.buildVerificationEmail({email, code});
        sgMail.send(msg);
        return true;
    }
};

module.exports = EmailService; 