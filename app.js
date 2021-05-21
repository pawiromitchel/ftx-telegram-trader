const FTXRest = require('ftx-api-rest');
const CONFIG = require('./config');

const ftx = new FTXRest(CONFIG.API)

ftx.request({
  method: 'GET',
  path: '/account'
}).then(console.log);