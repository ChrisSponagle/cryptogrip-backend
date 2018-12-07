/*********************************************************
 *******************    Information    *******************
 *********************************************************

	Controller to handle email verification and re-sending methods.

	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 05/02/2018
*********************************************************/

const mongoose = require('mongoose');
const User = mongoose.model('User');
const VerificationEmailModel = mongoose.model('VerificationEmail');
const {resendVerificationEmail} = require("../services/EmailService");

/**
 * Register new user account
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
*/
exports.confirmEmail = function(req, res, next)
{   
    // Get values from request
    const code = req.body.code || req.query.code;
    const sUserId = req.payload.id;

    if( !code )
    {
        return res.json({
                success: false,
                errors: {code: "field is required."}
              })
            .status(400);
    }

    User.findById(sUserId)
        .then(function(user){
            // Validate if code is correct on Database 
            var pUpdated = checkCodeIsCorrectUpdate({user, code});
            pUpdated.then(function(iCodeResponse){
                validateResponse({iCodeResponse, res, user});
            });
        });
}

/**
 * Conf update of email
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
exports.confirmEmailUpdate = function(req, res, next)
{   
    // Get values from request
    const code = req.body.code || req.query.code;
    const email = req.body.email || req.query.email;
    const sUserId = req.payload.id;

    if( !code )
    {
        return res.json({
                success: false,
                errors: {code: "field is required."}
              })
            .status(400);
    }

    User.findById(sUserId)
        .then(function(user){
            // Validate if code is correct on Database 
            var pUpdated = getVerificationEmailModel({user, code});
            pUpdated.then(function(emailModel)
            {
                if(!emailModel || emailModel.email !== email ){
                    return res.json({
                        success: false,
                        errors: {message: "Email update not found."}
                      }); 
                }

                user.email = emailModel.email;
                user.save();

                emailModel.verified = true;
                emailModel.save();

                return res.json({
                    success: true,
                  }) ;
            });
        });
}

/**
 * Resend verification code to user's email.
 * 
 * @param {*} req - Request object
 * @param {*} res - Response object
 * @param {*} next 
 */
exports.resendVerificationEmail = function(req, res, next)
{
    // Get values from request
    const sUserId = req.payload.id;
    const email = req.body.email || req.query.email;

    // Find user
    User.findById(sUserId)
        .then(function(oUser){
            // Find verification email
            VerificationEmailModel.findOne( {user: oUser, verified: false}, {},  { sort: { 'created_at' : -1 } } )
            .then(function(emailVerification){
                
                // If there is no verification code, return false
                if( !emailVerification )
                {
                    return res.json({
                        success: false,
                        errors: {message: "Verification code not found."}
                      })
                    .status(400);
                }
                
                var code = emailVerification.code;
                if(email){
                    oUser.email = email;
                }

                if( !resendVerificationEmail({oUser, code}) )
                {
                    return res.json({
                        success: false,
                        errors: {message: "Some error happened."}
                      })
                    .status(500);
                }

                return res.json({
                    success: true,
                  });
            });
        });
}

/**
 * Validate response from database and send it back to front-end
 * 
 * @param {*} res - Response object
 * @param {int} iCodeResponse - Integer value with result from database
 * @param {User} user - User related to request
 */
const validateResponse = function({res, iCodeResponse, user})
{
    switch(iCodeResponse){
        case -2:
        return res.json({
                success: false,
                errors: {database: "Some error happened on database."}
            })
            .status(500);
            break;
        case -1:
            return res.json({
                success: false,
                errors: {code: "Invalid code."}
            });
            break;
        case 1: 
            res.json({
                success: true
            });

            if(!user.verified){
                user.verified = true;
                user.save();
            }
            break;
        default:
            return res.json({
                success: false,
                errors: {code: "Invalid code."}
            });
    }
}

/**
 * Check if code sent is the same value present on database and return an integer
 *  according to the result of the transation.
 * 
 * @param {User} user
 * @param {String} code
 * @returns {Promise} - Returns a promise that will have the wanted result after checking on database
 * @returns {int} -2: No possible to update data, -1: Code is wrong or already verified, 1: Success
 */
const checkCodeIsCorrectUpdate = async function({user, code})
{
    try {
        const updated = await new Promise( ( resolve, reject ) => {
            VerificationEmailModel.findOneAndUpdate( 
                // Conditions
                {user: user, code: code, verified: false}, 
                // Update action
                {$set:{verified: true }},
                // Get updated document 
                {new: true}, (err, doc) => 
                {
                    if (err) {
                        console.log("Something wrong when updating data!");
                        resolve( -2 );
                    }
                    
                    // If there is no document, it means the code is wrong or it have already been verified
                    if( !doc ){
                        resolve( -1 );
                    }

                    // Success
                    resolve( 1 );
            });
        });

        return updated;
    }catch(err){};
}

/**
 * Check if email verification code is correct or not
 * 
 * @param {User} user
 * @param {String} code
 * @returns {Promise} - Returns a promise that will have the wanted result after checking on database
 */
const getVerificationEmailModel = 
exports.getVerificationEmailModel = async function({user, code})
{
    try {
        const verificationEmail = await new Promise( ( resolve, reject ) => {
            VerificationEmailModel.findOne( 
                // Conditions
                {user: user, code: code, verified: false}, 
                // Get document
                (err, doc) => 
                {
                    if (err) {
                        console.log("Something wrong when updating data!");
                        reject( err );
                    }
                    
                    // If there is no document, it means the code is wrong or it have already been verified
                    if( !doc ){
                        resolve( null );
                    }

                    // Found it and the code is correct
                    resolve( doc );
            });
        });

        return verificationEmail;
    }catch(err){};
}