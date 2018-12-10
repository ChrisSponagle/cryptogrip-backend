/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Route used to get accounts when sending coins on Incodium event   
    
*********************************************************/

var router = require('express').Router();

const UserController = require("../../controllers/UserController");


// Get list of accounts ordered by creation time
router.get('/api/accounts', UserController.getAccounts);

module.exports = router;