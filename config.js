// FTX API creds
const FTX_API = {
    key: '',
    secret: '',
    subaccount: ''
}
const TELEGRAM_BOT_TOKEN = '';

// this setting will increase the order size by 5x
let DEGEN = false;

// order size in percentage of the wallet balance
let ORDER_SIZE = 100;

module.exports = { FTX_API, ORDER_SIZE, TELEGRAM_BOT_TOKEN, DEGEN };