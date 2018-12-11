module.exports = {
  apps : [{
    name: 'Incodium_Wallet_API',
    script: 'app.js',
    instances: 2,
    autorestart: true,
    watch: true,
  }]
};
