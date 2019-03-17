
var router = require('express').Router();

var auth = require('../auth');
const UserController = require("../../controllers/UserController");
const EmailController = require("../../controllers/EmailController");

// Register new user account
router.post('/api/user', UserController.createAccount);

// Login user
router.post('/api/user/login', UserController.loginUser);

// Verify user's email
router.put('/api/user/verify/email', auth.required, EmailController.confirmEmail);

// Verify user's email and passphrase
router.put('/api/user/verify', auth.required, UserController.verifyUser);

// Resend user's verification email code
router.post('/api/user/verify/email/send', auth.required, EmailController.resendVerificationEmail);

// Get user's passphrase
router.get('/api/user/passphrase', auth.required, UserController.getPassPhrase);

// Update user's password
router.put('/api/user/password', auth.required, UserController.updatePassword);

//  Request update of user's email
router.put('/api/user/email', auth.required, UserController.updateEmail);

// Confirm update of user's email
router.post('/api/user/email', auth.required, EmailController.confirmEmailUpdate);

// Forget Password
router.post('/api/recovery', UserController.forgetPassword);

// Forget Password email verify link send
router.put('/api/reset/:token', UserController.forgetPasswordVerify);

module.exports = router;
