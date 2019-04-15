# Incodium Wallet API @ KeySupreme

# Getting started

To get the Node server running locally:

- Clone this repo
- `npm install` to install all required dependencies
- Install MongoDB Community Edition ([instructions](https://docs.mongodb.com/manual/installation/#tutorials)) and run it by executing `mongod`
- `npm run dev` to start the local server

# Code Overview

## Dependencies

- [expressjs](https://github.com/expressjs/express) - The server for handling and routing HTTP requests
- [express-jwt](https://github.com/auth0/express-jwt) - Middleware for validating JWTs for authentication
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - For generating JWTs used by authentication
- [mongoose](https://github.com/Automattic/mongoose) - For modeling and mapping MongoDB data to javascript
- [mongoose-unique-validator](https://github.com/blakehaswell/mongoose-unique-validator) - For handling unique validation errors in Mongoose. Mongoose only handles validation at the document level, so a unique index across a collection will throw an exception at the driver level. The `mongoose-unique-validator` plugin helps us by formatting the error like a normal mongoose `ValidationError`.
- [passport](https://github.com/jaredhanson/passport) - For handling user authentication
- [slug](https://github.com/dodo/node-slug) - For encoding titles into a URL-friendly format

## Application Structure

- `app.js` - The entry point to our application. This file defines our express server and connects it to MongoDB using mongoose. It also requires the routes and models we'll be using in the application.
- `config/` - This folder contains configuration for passport as well as a central location for configuration/environment variables.
- `routes/` - This folder contains the route definitions for our API.
- `models/` - This folder contains the schema definitions for our MySql models.

## Authentication

Requests are authenticated using the `Authorization` header with a valid JWT. We define two express middlewares in `routes/auth.js` that can be used to authenticate requests. The `required` middleware configures the `express-jwt` middleware using our application's secret and will return a 401 status code if the request cannot be authenticated. The payload of the JWT can then be accessed from `req.payload` in the endpoint. The `optional` middleware configures the `express-jwt` in the same way as `required`, but will *not* return a 401 status code if the request cannot be authenticated.

## Blockchain

### Etherium

It is possible to use the Ropsten Testnet or the Main Etherium network.

In order to do it, make sure the correct value is set to .env file

#### Ropsten Network

```
WEB3_PROVIDER="https://ropsten.infura.io/v3/d92bb372bbe0423a89aabbf883491237"
ETHERSCAN_API="https://api-ropsten.etherscan.io/api"
ETHERSCAN_URL="https://ropsten.etherscan.io"
ETHERSCAN_KEY=KT9NCH34IG9VWUGZ5N63PKSGTJC1G9HE9Q
```

#### Main Network

```
WEB3_PROVIDER="https://mainnet.infura.io/v3/d92bb372bbe0423a89aabbf883491237"
ETHERSCAN_API="http://api.etherscan.io/"
ETHERSCAN_URL="https://etherscan.io"
ETHERSCAN_API=KT9NCH34IG9VWUGZ5N63PKSGTJC1G9HE9Q
```

### Bitcoin

#### Test Network

```
BITCOIN_MAIN_NETWORK=0
BLOCKCHAIN_INFO_URL="https://testnet.blockchain.info"
BLOCKCHAIN_URL="https://www.blockchain.com/en/btctest/tx/"
```

#### Main Network

```
BITCOIN_MAIN_NETWORK=1
BLOCKCHAIN_INFO_URL="https://blockchain.info"
BLOCKCHAIN_URL="https://www.blockchain.com/en/btc/tx/"
```