
var router = require('express').Router();

var auth = require('../auth');
const UserController = require("../../controllers/UserController");

// Verify user's email
router.get('/api/transactions', auth.required, UserController.confirmEmail);


module.exports = router;