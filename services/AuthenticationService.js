/*********************************************************
 *******************    Information    *******************
 *********************************************************

    Service to checkup if user is fully authenticated or not
    
	Version: 2018
	Author: Lorran Pegoretti
	Email: lorran.pegoretti@keysupreme.com
	Subject: Incodium Wallet API
	Date: 06/12/2018
*********************************************************/

const AuthenticationService = 
{   
    /**
     * Check if user is fully authenticated or not
     */
    isFullyAuthenticated : function( { user, res} )
    {
        if(!user.verified)
        {
            res.json({
                success: false,
                passphrase: null,
                errors: {
                    login: false,
                    message: "User is not fully authenticated.",
                }
            });

            return false;
        }

        return true;
    }
}

module.exports = AuthenticationService; 