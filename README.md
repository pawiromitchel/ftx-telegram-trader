# telegram-bot-ftx
I've created a Telegram bot that can handle commands that sends them to [FTX](https://ftx.com/#a=4341346) via the [FTX API](https://docs.ftx.com/#rest-api). This bot was to create fast orders so I don't have to go to the FTX interface and place the order manually. 

# Setup
1. create a telegram bot by connecting with the [BotFather](https://telegram.me/BotFather), start the bot, click /newbot, give your bot a name and you have yourself a bot. KEEP THE API TOKEN SAFE!
2. Make an account on [FTX](https://ftx.com/#a=4341346) and create a API key
3. Go to the [API Client](https://docs.ftx.com/#rest-api) and read all about the requests
4. Edit the config.js file and add the required values
5. Start the bot with `node app.js`
6. Interact with your bot by chatting with it

# Bot Commands
- /info - Info about the bot
- /degen - Increase order by 5x
- /balance - Get account balance
- /open - Get open orders
- /buy - Create a buy order
- /sell - Create a sell order
- /close - Close all open orders
