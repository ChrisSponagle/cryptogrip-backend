// var mongoose = require('mongoose');
var router = require('express').Router();

var auth = require('../auth');
const UserController = require("../../controllers/UserController");
const EmailController = require("../../controllers/EmailController");

// Register new user account
router.post('/api/user', UserController.createAccount);

// Verify user's email
router.put('/api/user/verify/email', auth.required, EmailController.confirmEmail);

// Verify user's email and passphrase
router.put('/api/user/verify', auth.required, EmailController.confirmEmail);

// Resend user's verification email code
router.post('/api/user/verify/email/send', auth.required, EmailController.resendVerificationEmail);

// Get user's passphrase
router.get('/api/user/passphrase', auth.required, UserController.getPassPhrase);

// Login user
router.post('/api/user/login', UserController.loginUser);

// router.get('/user', auth.required, function(req, res, next){
//   User.findById(req.payload.id).then(function(user){
//     if(!user){ return res.sendStatus(401); }

//     return res.json({user: user.toAuthJSON()});
//   }).catch(next);
// });

// router.put('/user', auth.required, function(req, res, next)
// {
//   User.findById(req.payload.id).then(function(user){
//     if(!user){ return res.sendStatus(401); }

//     // 
//     if(typeof req.body.user.username !== 'undefined'){
//       user.username = req.body.user.username;
//     }
//     if(typeof req.body.user.email !== 'undefined'){
//       user.email = req.body.user.email;
//     }
//     if(typeof req.body.user.password !== 'undefined'){
//       user.setPassword(req.body.user.password);
//     }

//     return user.save().then(function(){
//       return res.json({user: user.toAuthJSON()});
//     });
//   }).catch(next);
// });

module.exports = router;
