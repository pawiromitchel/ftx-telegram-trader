const FTXRest = require('ftx-api-rest');
const TelegramBot = require('node-telegram-bot-api');
const CONFIG = require('./config/config');
const DB = require('./services/data.service');
const HELPER = require('./services/helper.service');
const FTX = require('./services/ftx.service');
const express = require("express")
const app = express()
// To parse the incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true }))
// handle content type text/plain and text/json
app.use(express.text())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.json()) // To parse the incoming requests with JSON payloads


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

        if (HELPER.checkText(text, 'info')) {
            bot.sendMessage(chatId, `Hello ${msg.from.first_name} 👋,
What can I 😎 do for you?

/info - Info about the bot
/degen - Increase order by 5x
/size - Edit your order size in % [eg. size 10]
/balance - Get account balance
/open - Get open orders
/buy - Create a buy / long order [eg. /buy eth]
/sell - Create a sell / short order [eg. /sell eth]
/close - Close all open orders [for specific pair /close eth]
/openlimit - Get open limit orders
/limitbuy - Create a buy / long limit order [eg. /limitbuy eth 2000]
/limitsell - Create a sell / short limit order [eg. /limitsell eth 5000]
/closelimit - Close all limit orders [for specific pair /closelimit eth]
/alert - Forward TV alerts to this chat/chatroom

My creator is @pawiromitchel 🤗
He's constantly teaching me new stuff, so be on the lookout for new functionalities`);
        }

        if (HELPER.checkText(text, 'degen')) {
            if (check[0].degen) {
                DB.setDegenMode(chatId, false);
                bot.sendMessage(chatId, `Degen Mode ❌`);
            } else {
                DB.setDegenMode(chatId, true);
                bot.sendMessage(chatId, `Degen Mode ✅\nOrder size will increase with 5x 👀!`);
                bot.sendAnimation(chatId, './assets/degen_mode.mp4')
            }
        }

        if (HELPER.checkText(text, 'size')) {
            const size = text.split(' ');
            if (size[1]) {
                DB.setOrderSize(chatId, size[1]);
                bot.sendMessage(chatId, `You're order size is now ${size[1]}% of your collateral`)
            } else {
                bot.sendMessage(chatId, 'Can you please give me a number to work with');
            }
        }

        if (HELPER.checkText(text, 'buy') || HELPER.checkText(text, 'sell') || HELPER.checkText(text, 'long') || HELPER.checkText(text, 'short')) {
            text = text.replace('long', 'buy');
            text = text.replace('short', 'sell');

            let order = text.split(' ');
            // only exec when there's a pair given
            if (order[1]) {
                // create the order
                let side = order[0].replace('/', '').replace(CONFIG.BOTNAME, '');
                let pair = HELPER.convertString(order[1]);

                // if there's no size given then default should be 100% of the portfolio
                let size = check[0].orderSize ? check[0].orderSize : 100;
                // if degen is true then increase size with 5x
                let upSize = check[0].degen ? size * 5 : size;
                let accountInfo = await FTX.getBalance(API_CONNECTION);
                FTX.marketOrder(API_CONNECTION, upSize, pair, side)
                    .then(async () => {
                        // buy 0.01 ETH at $2800
                        bot.sendMessage(chatId, `✅ ${side.toUpperCase()} $${((upSize / 100) * accountInfo.collateral).toFixed(2)} ${pair} @ $${await FTX.getPrice(API_CONNECTION, pair)}`)
                    })
                    .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
            } else {
                bot.sendMessage(chatId, 'Come on man, I need more info 😒');
            }
        }

        // /limitbuy ETH 2800
        if (HELPER.checkText(text, 'limitbuy') || HELPER.checkText(text, 'limitsell') || HELPER.checkText(text, 'limitlong') || HELPER.checkText(text, 'limitshort')) {
            text = text.replace('long', 'buy');
            text = text.replace('short', 'sell');
            let order = text.split(' ');
            // only exec when there's a pair + a price given
            if (order[1] && order[2]) {
                // create the order
                let side = order[0].replace('/limit', '').replace(CONFIG.BOTNAME, '');
                let pair = HELPER.convertString(order[1]);
                let price = order[2];

                // if there's no size given then default should be 100% of the portfolio
                let size = check[0].orderSize ? check[0].orderSize : 100;
                // if degen is true then increase size with 5x
                let upSize = check[0].degen ? size * 5 : size;
                let accountInfo = await FTX.getBalance(API_CONNECTION);
                FTX.marketOrder(API_CONNECTION, upSize, pair, side, 'limit', price)
                    .then(async () => {
                        bot.sendMessage(chatId, `✅ LIMIT ${side.toUpperCase()} $${((upSize / 100) * accountInfo.collateral).toFixed(2)} ${pair} @ $${price}`)
                    })
                    .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
            } else {
                bot.sendMessage(chatId, 'Come on man, I need more info 😒');
            }
        }

        if (HELPER.checkText(text, 'closelimit')) {
            let pair = text.split(' ');
            await FTX.closeLimitOrders(API_CONNECTION, pair[1] ? pair[1] : '')
                .then(() => bot.sendMessage(chatId, `✅ Closing Limit Orders`))
                .catch(res => bot.sendMessage(chatId, `❌ ${res}`))
        }

        if (HELPER.checkText(text, 'balance')) {
            let accountInfo = await FTX.getBalance(API_CONNECTION);
            const size = check[0].orderSize ? check[0].orderSize : 100;
            const upSize = check[0].degen ? size * 5 : size;
            bot.sendMessage(chatId, `
::Balance::
Collateral: $${(accountInfo.collateral).toFixed(2)}
Account Value: $${(accountInfo.totalAccountValue).toFixed(2)}
Margin Fraction: ${(accountInfo.marginFraction * 100).toFixed(2)}%
TotalPositionSize: $${(accountInfo.totalPositionSize).toFixed(2)}
Leverage: ${accountInfo.leverage}

::Settings::
Order Size: ${upSize}% of collateral
Degen Mode: ${check[0].degen ? '✅' : '❌'}
            `);
        }

        if (HELPER.checkText(text, 'openlimit')) {
            await FTX.openLimitOrders(API_CONNECTION)
                .then(res => {
                    if (res.result.length > 0) {
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

        if (HELPER.checkText(text, 'open')) {
            let orders = await FTX.openOrders(API_CONNECTION);
            if (orders.length > 0) {
                bot.sendMessage(chatId, `::Open Orders::`);
                orders.forEach(async order => {
                    let price = await FTX.getPrice(API_CONNECTION, order.future);
                    bot.sendMessage(chatId, `
${order.side.toUpperCase()} ${order.future}
Funding Rate: ${await FTX.fundingRate(API_CONNECTION, order.future)}

AvgPrice: $${order.recentAverageOpenPrice.toFixed(2)}
Size: ${order.size}
Liq Price: $${order.estimatedLiquidationPrice.toFixed(2)}

PnL Today: $${order.realizedPnl.toFixed(2)}
MarkPrice: $${price}
Profit: ${HELPER.calculateProfit(order.recentAverageOpenPrice, price, order.side)}%
                    `);
                });
            } else {
                bot.sendMessage(chatId, 'No open orders');
            }
        }

        if (HELPER.checkText(text, 'close')) {
            let args = text.split(' ');
            let orders = await FTX.openOrders(API_CONNECTION);
            if (orders.length > 0) {
                bot.sendMessage(chatId, `::Closing Orders::`);
                if (args[1]) {
                    orders = orders.filter(position => position.future.toLowerCase().includes(args[1].toLowerCase()))
                    console.log(orders);
                    if (orders.length === 0) bot.sendMessage(chatId, `❌ Can't find ${args[1]}`);
                }

                orders.forEach(async order => {
                    let price = await FTX.getPrice(API_CONNECTION, order.future);
                    bot.sendMessage(chatId, `
Closing ${order.side.toUpperCase()} ${order.future}
Funding Rate: ${await FTX.fundingRate(API_CONNECTION, order.future)}

AvgPrice: $${order.recentAverageOpenPrice.toFixed(2)}
Size: ${order.size}
Liq Price: $${order.estimatedLiquidationPrice.toFixed(2)}

PnL Today: $${order.realizedPnl.toFixed(2)}
MarkPrice: $${price}
Profit: ${HELPER.calculateProfit(order.recentAverageOpenPrice, price, order.side)}%
                    `);
                });
            } else {
                bot.sendMessage(chatId, `No open orders`);
            }

            // only exec when there's a pair given
            if (args[1]) {
                FTX.closeOrders(API_CONNECTION, args[1]);
            } else {
                FTX.closeOrders(API_CONNECTION);
            }
        }

        if (HELPER.checkText(text, 'alert')) {
            bot.sendMessage(chatId, `So, you want Tradingview alerts right? 👀 He's what you need to do:
- Set the condition of your indicator
- Options = Once per bar close
- Webhook URL = http://31.220.56.175/hook
- Give it any alert name
- Message should be = {"chatId":${chatId},"type":"BUY or SELL","exchange":"{{exchange}}","ticker":"{{ticker}}","reason":"Reason for this alert"}`)
        }
    } else if (!check.length > 0) {
        bot.sendMessage(chatId, `Bot not configured correctly, this is how you do it`);
        bot.sendMessage(chatId, `/auth API_KEY API_SECRET SUBACCOUNT_NAME`);
    }
});

// default route
app.get("/", (req, res) => {
    res.status(200).send('silence is golden').end()
})

app.post("/hook", (req, res) => {
    console.log('Webhook received', req.body);
    if (req.body.chatId) {
        const order = req.body;
        bot.sendMessage(order.chatId, `✅ Webhook received:
${order.type} signal for ${order.ticker} on ${order.exchange}\nReason: ${order.reason}`)
    }
    res.status(200).end()
})

/**
 * Made possible by forwarding port 80 from node to the server
 * https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps
 */
const PORT = 80;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))