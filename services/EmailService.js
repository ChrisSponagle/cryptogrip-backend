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

var mongoose = require('mongoose');
var VerificationEmailModel = mongoose.model('VerificationEmail');
var verificationEmail = require("../emails/verificationEmail");
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_KEY);

const EmailService = 
{   
    /**
     * Send verification email with new code
     * 
     * @param {User} oUser 
     */
    sendVerificationEmail: function({oUser})
    {
        const code = Math.floor(Math.random() * 90000) + 10000;       
        const email = oUser.email;
        msg = verificationEmail.buildVerificationEmail({email, code});
        
        sgMail.send(msg)
            .then(EmailService.saveVerificationCode({code, oUser}));
        return true;
    },

    /**
     * Resend verification email to user's email
     * 
     * @param {User} oUser 
     * @param {String} code
     */
    resendVerificationEmail: function({oUser, code})
    {
        const email = oUser.email;
        msg = verificationEmail.buildVerificationEmail({email, code});
        
        sgMail.send(msg)
            .then(EmailService.saveVerificationCode({code, oUser}));
        return true;
    },

    /**
     * Save verification code on database
     * @param {string} code
     * @param {User} oUser
     */
    saveVerificationCode: function({code, oUser})
    {
        var oVerificationEmail = new VerificationEmailModel();
        oVerificationEmail.user = oUser;
        oVerificationEmail.code = code;
        oVerificationEmail.save();
    }
};

module.exports = EmailService; 