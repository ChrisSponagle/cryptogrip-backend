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
    sendVerificationEmail: function({oUser, newEmail})
    {
        const code = Math.floor(Math.random() * 90000) + 10000;
        var email = "";
        if(!newEmail){
            email = oUser.email;
        }else{
            email = newEmail;
        }
        
        msg = verificationEmail.buildVerificationEmail({email, code});
        
        sgMail.send(msg)
            .then(EmailService.saveVerificationCode({code, oUser, newEmail}));
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
        
        sgMail.send(msg);
        return true;
    },

    /**
     * Save verification code on database
     * @param {string} code
     * @param {User} oUser
     */
    saveVerificationCode: function({code, oUser, newEmail})
    {
        var oVerificationEmail = new VerificationEmailModel();
        oVerificationEmail.user = oUser;
        oVerificationEmail.code = code;
        if(newEmail){
            oVerificationEmail.email = newEmail;
        }
        oVerificationEmail.save();
    },
};

module.exports = EmailService; 