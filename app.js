const FTXRest = require('ftx-api-rest');
const TelegramBot = require('node-telegram-bot-api');
const CONFIG = require('./config');
const ftx = new FTXRest(CONFIG.FTX_API)

/**
 * This will calculate the order size based on the portfolio balance
 * @param {number} percentage how big the order has to be in percentage
 * @param {string} pair eth or btc
 */
async function calculatePortfolio(percentage, pair) {
    // get account info
    let request = ftx.request({
        method: 'GET',
        path: '/account'
    })
    let result = await request;

    // get market rates
    pair = convertString(pair);
    let request2 = ftx.request({
        method: 'GET',
        path: '/markets/' + pair
    })
    let result2 = await request2;
    let price = result2.result.price;
    
    // how much free collateral does the account have
    let freeCollateral = result.result.freeCollateral;
    // calculate the asset amount size of the order
    let orderSizePair = ((percentage / 100) * freeCollateral) / price;

    return orderSizePair;
}

/**
 * This function will convert user into into the right contract of the Exchange
 * @param {string} string input command
 * @returns converted string
 */
function convertString(string) {
    switch (string) {
        case 'eth':
            string = 'ETH-PERP'
            break;
        case 'btc':
            string = "BTC-PERP"
            break;
        default:
            break;
    }
    return string;
}

/**
 * Create the market order
 * @param {string} pair eth or btc
 * @param {string} side buy or sell
 * @param {string} size size of the order
 */
async function marketOrder(pair, side) {
    pair = convertString(pair);
    let size = await calculatePortfolio(CONFIG.ORDER_SIZE, pair);

    return ftx.request({
        method: 'POST',
        path: '/orders',
        data: {
            market: pair,
            size: size,
            side: side,
            type: 'market',
            price: null
        }
    });
}

/**
 * This function will first get all positions, filter through them and close them all
 */
async function closeOrders() {
    let request = ftx.request({
        method: 'GET',
        path: '/positions'
    });

    let result = await request;
    let onlyPositionsWithSize = result.result.filter(pos => pos.size !== 0);

    if(onlyPositionsWithSize.length > 0) {
        onlyPositionsWithSize.forEach(position => {
            ftx.request({
                method: 'POST',
                path: '/orders',
                data: {
                    market: position.future,
                    size: position.size,
                    // buy = sell, sell = buy
                    side: position.side === 'buy' ? 'sell' : 'buy',
                    type: 'market',
                    price: null
                }
            }).then(console.log).catch(err => console.log(err));
        })
    } else {
        console.log('No open orders');
    }
}

const token = CONFIG.TELEGRAM_BOT_TOKEN;
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
bot.on("polling_error", (msg) => console.log(msg));
bot.on('message', (msg) => {
    // get ID from the one who chats
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text: '';

    if(text.includes('buy') || text.includes('sell')){
        let order = text.split(' ');
        // only exec when there's a pair given
        if(order[1]) {
            // create the order
            let type = order[0];
            let pair = order[1];
            marketOrder(pair, type).then(res => console.log(res));
        }
    }

    if(text === 'close'){
        bot.sendMessage(chatId, `Closing order(s)`);
        closeOrders();
    }
});
