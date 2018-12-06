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

var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('User');
var VerificationEmailModel = mongoose.model('VerificationEmail');
const {sendVerificationEmail} = require("../services/EmailService");

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
    var code = req.body.code || req.query.code;
    var sUserId = req.payload.id;

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
            var pUpdated = checkCodeIsCorrect({user, code});
            pUpdated.then(function(iCodeResponse){
                validateResponse({iCodeResponse, res, user});
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
const checkCodeIsCorrect = async function({user, code})
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