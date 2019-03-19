var mongoose = require('mongoose');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_KEY);
const hostPath = process.env.HOST_PATH;


const RecoveryService = 
{   
    recoveryEmail: async function({sEmail, sToken})
    {
        try {
            const msg = {
                to: sEmail,
                from: 'recovery@incowallet.com',
                subject: 'Incowallet Password Reset',
                html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' + 
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                hostPath + '/reset/' + sToken + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            }
            await sgMail.send(msg);
            return true;
        } catch(err) {
            console.log("This is host>>>" + host)
            console.log("SEND MAIL ERROR:>>>>> " + err)
        }
    },
};

module.exports = RecoveryService; 