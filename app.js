const FTXRest = require('ftx-api-rest');
const TelegramBot = require('node-telegram-bot-api');
const CONFIG = require('./config');
const DB = require('./handleData');
const BOTNAME = 'DegenTraderV2_bot';

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
    return `${string.toUpperCase()}-PERP`;
}

/**
 * Create the market order
 * @param {string} pair eth or btc
 * @param {string} side buy or sell
 * @param {string} size size of the order
 */
async function marketOrder(API_CONNECTION, orderSize, pair, side, type = 'market', price = null) {
    let size = await calculatePortfolio(API_CONNECTION, orderSize, pair);

    return API_CONNECTION.request({
        method: 'POST',
        path: '/orders',
        data: {
            market: pair,
            size: size,
            side: side,
            type: type,
            price: price
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

async function openLimitOrders(API_CONNECTION) {
    return API_CONNECTION.request({
        method: 'GET',
        path: '/orders'
    });
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

/**
 * Close limit orders
 * @param {*} API_CONNECTION 
 * @returns 
 */
async function closeLimitOrders(API_CONNECTION) {
    return API_CONNECTION.request({
        method: 'DELETE',
        path: '/orders'
    });
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

/**
 * Check if the incoming text === checkText
 * @param {string} incomingText 
 * @param {string} checkText 
 * @returns boolean
 */
function checkText(incomingText, checkText) {
    incomingText = incomingText.split(' ')[0];
    incomingText = incomingText.replace('/', '');
    return incomingText === checkText || incomingText === (`${checkText}@${BOTNAME}`)
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
                subaccount: split[3],
                orderSize: 100,
                degen: false
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

        if (checkText(text, 'info')) {
            const size = check[0].orderSize ? check[0].orderSize : 100;
            const upSize = check[0].degen ? size * 5 : size;
            bot.sendMessage(chatId, `::Info::
Order Size: ${upSize}% of collateral
Degen Mode: ${check[0].degen ? '✅' : '❌'}`
            );
        }

        if (checkText(text, 'degen')) {
            if (check[0].degen) {
                DB.setDegenMode(chatId, false);
                bot.sendMessage(chatId, `Degen Mode ❌`);
            } else {
                DB.setDegenMode(chatId, true);
                bot.sendMessage(chatId, `Degen Mode ✅\nOrder size will increase with 5x 👀!`);
                bot.sendAnimation(chatId, './assets/degen_mode.mp4')
            }
        }

        if (checkText(text, 'size')) {
            const size = text.split(' ');
            if (size[1]) {
                DB.setOrderSize(chatId, size[1]);
                bot.sendMessage(chatId, `You're order size is now ${size[1]}% of your collateral`)
            } else {
                bot.sendMessage(chatId, 'Can you please give me a number to work with');
            }
        }

        if (checkText(text, 'buy') || checkText(text, 'sell') || checkText(text, 'long') || checkText(text, 'short')) {
            text = text.replace('long', 'buy');
            text = text.replace('short', 'sell');

            let order = text.split(' ');
            // only exec when there's a pair given
            if (order[1]) {
                // create the order
                let side = order[0].replace('/', '').replace(BOTNAME, '');
                let pair = convertString(order[1]);

                // if there's no size given then default should be 100% of the portfolio
                let size = check[0].orderSize ? check[0].orderSize : 100;
                // if degen is true then increase size with 5x
                let upSize = check[0].degen ? size * 5 : size;
                marketOrder(API_CONNECTION, upSize, pair, side)
                    .then(async () => {
                        // buy 0.01 ETH at $2800
                        bot.sendMessage(chatId, `${side.toUpperCase()} $${upSize} ${pair} @ $${await getPrice(API_CONNECTION, pair)}`)
                    })
                    .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
            } else {
                bot.sendMessage(chatId, 'Come on man, I need more info 😒');
            }
        }

        // /limitbuy ETH 2800
        if (checkText(text, 'limitbuy') || checkText(text, 'limitsell') || checkText(text, 'limitlong') || checkText(text, 'limitshort')) {
            text = text.replace('long', 'buy');
            text = text.replace('short', 'sell');
            let order = text.split(' ');
            // only exec when there's a pair + a price given
            if (order[1] && order[2]) {
                // create the order
                let side = order[0].replace('/limit', '').replace(BOTNAME, '');
                let pair = convertString(order[1]);
                let price = order[2];

                // if there's no size given then default should be 100% of the portfolio
                let size = check[0].orderSize ? check[0].orderSize : 100;
                // if degen is true then increase size with 5x
                let upSize = check[0].degen ? size * 5 : size;
                marketOrder(API_CONNECTION, upSize, pair, side, 'limit', price)
                    .then(async () => {
                        bot.sendMessage(chatId, `LIMIT ${side.toUpperCase()} $${upSize} ${pair} @ $${price}`)
                    })
                    .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
            } else {
                bot.sendMessage(chatId, 'Come on man, I need more info 😒');
            }
        }

        if (checkText(text, 'closelimit')) {
            await closeLimitOrders(API_CONNECTION)
                .then(() => bot.sendMessage(chatId, `✅ Closing Limit Orders`))
                .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
        }

        if (checkText(text, 'balance')) {
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

        if(checkText(text, 'openlimit')){
            await openLimitOrders(API_CONNECTION)
            .then(res => {
                if(res.result.length > 0) {
                    bot.sendMessage(chatId, `::Open Limit Orders::`);
                    res.result.forEach(order => {
                        bot.sendMessage(chatId, `
LIMIT ${order.side.toUpperCase()} ${order.future}
Price: $${order.price.toFixed(2)}
Size: ${order.size}
                        `);
                    })
                } else {
                    bot.sendMessage(chatId, `No Limit orders found`);
                }
            })
            .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
        }

        if (checkText(text, 'open')) {
            let orders = await openOrders(API_CONNECTION);
            if (orders.length > 0) {
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
            } else {
                bot.sendMessage(chatId, 'No open orders');
            }
        }

        if (checkText(text, 'close')) {
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