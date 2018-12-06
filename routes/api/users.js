// var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var auth = require('../auth');
const UserController = require("../../controllers/UserController");
const EmailController = require("../../controllers/EmailController");

// Register new user account
router.post('/api/user', UserController.createAccount);

// Verify user's email
router.put('/api/user/verify/email', auth.required, EmailController.confirmEmail);

// Get user's passphrase
router.get('/api/user/passphrase', auth.required, UserController.getPassPhrase);

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

// router.post('/users/login', function(req, res, next){
//   if(!req.body.user.email){
//     return res.status(422).json({errors: {email: "can't be blank"}});
//   }

//   if(!req.body.user.password){
//     return res.status(422).json({errors: {password: "can't be blank"}});
//   }

//   passport.authenticate('local', {session: false}, function(err, user, info){
//     if(err){ return next(err); }

//     if(user){
//       user.token = user.generateJWT();
//       return res.json({user: user.toAuthJSON()});
//     } else {
//       return res.status(422).json(info);
//     }
//   })(req, res, next);
// });


module.exports = router;
