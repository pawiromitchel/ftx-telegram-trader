const FTXRest = require('ftx-api-rest');
const TelegramBot = require('node-telegram-bot-api');
const CONFIG = require('./config');
const DB = require('./handleData');

async function getBalance(API_CONNECTION) {
    // get account info
    let request = API_CONNECTION.request({
        method: 'GET',
        path: '/account'
    })
    let result = await request;
    return result.result;
}

async function getPrice(API_CONNECTION, pair) {
    // get market rates
    pair = convertString(pair);
    let request2 = API_CONNECTION.request({
        method: 'GET',
        path: '/markets/' + pair
    })
    let result2 = await request2;
    let price = result2.result.price;
    return price;
}

/**
 * This will calculate the order size based on the portfolio balance
 * @param {number} percentage how big the order has to be in percentage
 * @param {string} pair eth or btc
 */
async function calculatePortfolio(API_CONNECTION, percentage, pair) {
    // get account info
    let request = API_CONNECTION.request({
        method: 'GET',
        path: '/account'
    })
    let result = await request;

    // get market rates
    pair = convertString(pair);
    let request2 = API_CONNECTION.request({
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
async function marketOrder(API_CONNECTION, pair, side) {
    pair = convertString(pair);
    let size = await calculatePortfolio(API_CONNECTION, CONFIG.ORDER_SIZE, pair);

    return API_CONNECTION.request({
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

async function openOrders(API_CONNECTION) {
    let request = API_CONNECTION.request({
        method: 'GET',
        path: '/positions',
        data: {
            showAvgPrice: true
        }
    });

    let result = await request;
    let onlyPositionsWithSize = result.result.filter(pos => pos.size !== 0);
    return onlyPositionsWithSize;
}

/**
 * This function will first get all positions, filter through them and close them all
 */
async function closeOrders(API_CONNECTION) {
    let onlyPositionsWithSize = await openOrders(API_CONNECTION);

    if (onlyPositionsWithSize.length > 0) {
        onlyPositionsWithSize.forEach(position => {
            API_CONNECTION.request({
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
            });
        })
    } else {
        console.log('No open orders');
    }
}

async function calculateProfit(entry, mark, side) {
    return (((side === 'buy' ? mark / entry : entry / mark) * 100) - 100).toFixed(3)
}

async function fundingRate(API_CONNECTION, pair) {
    let request = API_CONNECTION.request({
        method: 'GET',
        path: '/funding_rates',
        data: {
            future: pair
        }
    });

    let result = await request;
    return result.result[0].rate;
}

function reCalculateOrderSize() {
    CONFIG.ORDER_SIZE = 100 * (CONFIG.DEGEN ? 5 : 1);
}

const token = CONFIG.TELEGRAM_BOT_TOKEN;
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });
bot.on("polling_error", (msg) => console.log(msg));
bot.on('message', async (msg) => {
    // get ID from the one who chats
    const chatId = msg.chat.id;
    let text = msg.text ? msg.text : '';

    // check if there's already a record of the user in the array
    let check = await DB.getOne(chatId);

    /**
    * This trigger is to save the auth keys in the local array
    * "/auth API_KEY API_SECRET SUBACCOUNT_NAME"
    * 
    * No Database? For privacy reasons
    */
    if (text.includes('/auth')) {
        if (text.split(' ').length === 4) {
            const split = text.split(' ');

            let record = {
                chatId: chatId,
                key: split[1],
                secret: split[2],
                subaccount: split[3]
            };

            // if there's no record of it, add it to the array
            if (!check.length > 0) {
                CONFIG.API_KEYS.push(record);
                DB.saveKey(record);
                bot.sendMessage(chatId, `Keys saved, please call /balance to check if it's working correctly`)
            } else {
                bot.sendMessage(chatId, `I've detected a previous configured record of you, overwriting it with the current values`)
                DB.overWriteKey(record);
            }
        }
    }

    if (check.length > 0) {
        // make the connection with the user credentials
        const API_CONNECTION = new FTXRest(check[0]);

        if (text.includes('/info')) {
            bot.sendMessage(chatId, `::Info::\nOrder Size: ${CONFIG.ORDER_SIZE}% of Balance\nDEGEN: ${CONFIG.DEGEN}`);
        }

        if (text.includes('/degen')) {
            if (CONFIG.DEGEN) {
                CONFIG.DEGEN = false;
                bot.sendMessage(chatId, `Degen Mode OFF`);
            } else {
                CONFIG.DEGEN = true;
                bot.sendMessage(chatId, `Degen Mode ON\nOrder size will increase with 5x!`);
            }
            reCalculateOrderSize();
        }

        if (text.includes('/long') || text.includes('/short')) {
            text = text.replace('long', 'buy');
            text = text.replace('short', 'sell');
        }

        if (text.includes('/buy') || text.includes('/sell')) {
            let order = text.split(' ');
            // only exec when there's a pair given
            if (order[1]) {
                // create the order
                let type = order[0].replace('/', '');
                let pair = order[1];
                marketOrder(API_CONNECTION, pair, type);
                bot.sendMessage(chatId, `
::Order::
${type.toUpperCase()} order placed for ${pair} at price ${await getPrice(API_CONNECTION, pair)}
                `);
            } else {
                bot.sendMessage(chatId, 'Please specify the asset (eth or btc) kind sir, I am not that smart you know');
            }
        }

        if (text.includes('/balance')) {
            let accountInfo = await getBalance(API_CONNECTION);
            bot.sendMessage(chatId, `
::Balance::
Collateral: $${(accountInfo.collateral).toFixed(2)}
Account Value: $${(accountInfo.totalAccountValue).toFixed(2)}
Margin Fraction: ${(accountInfo.marginFraction * 100).toFixed(2)}%
TotalPositionSize: $${(accountInfo.totalPositionSize).toFixed(2)}
Leverage: ${accountInfo.leverage}
            `);
        }

        if (text.includes('/open')) {
            let orders = await openOrders(API_CONNECTION);
            bot.sendMessage(chatId, `::Open Orders::`);
            orders.forEach(async order => {
                let price = await getPrice(API_CONNECTION, order.future);
                bot.sendMessage(chatId, `
${order.side.toUpperCase()} ${order.future}
Funding Rate: ${await fundingRate(API_CONNECTION, order.future)}

AvgPrice: $${order.recentAverageOpenPrice.toFixed(2)}
Size: ${order.size}
Liq Price: $${order.estimatedLiquidationPrice.toFixed(2)}

PnL Today: $${order.realizedPnl.toFixed(2)}
MarkPrice: $${price}
Profit: ${await calculateProfit(order.recentAverageOpenPrice, price, order.side)}%
                `);
            });
        }

        if (text.includes('/close')) {
            let orders = await openOrders(API_CONNECTION);
            bot.sendMessage(chatId, `::Closing Orders::`);
            orders.forEach(async order => {
                let price = await getPrice(API_CONNECTION, order.future);
                bot.sendMessage(chatId, `
Closing ${order.side.toUpperCase()} ${order.future}
Funding Rate: ${await fundingRate(API_CONNECTION, order.future)}

AvgPrice: $${order.recentAverageOpenPrice.toFixed(2)}
Size: ${order.size}
Liq Price: $${order.estimatedLiquidationPrice.toFixed(2)}

PnL Today: $${order.realizedPnl.toFixed(2)}
MarkPrice: $${price}
Profit: ${await calculateProfit(order.recentAverageOpenPrice, price, order.side)}%
                `);
            });
            closeOrders(API_CONNECTION);
        }
    } else if (!check.length > 0) {
        bot.sendMessage(chatId, `Bot not configured correctly, this is how you do it`);
        bot.sendMessage(chatId, `/auth API_KEY API_SECRET SUBACCOUNT_NAME`);
    }
});