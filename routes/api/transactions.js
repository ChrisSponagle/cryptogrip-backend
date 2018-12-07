
var router = require('express').Router();

var auth = require('../auth');
const UserController = require("../../controllers/UserController");
const TransactionController = require("../../controllers/TransactionController");

// Get history of transactions for user account
router.get('/api/transaction/history', auth.required, TransactionController.getUserTransactionsHistory);

// Get balance of account
router.get('/api/balance', auth.required, TransactionController.getUserBalance);


module.exports = router;