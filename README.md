# telegram-bot-ftx
I've created a Telegram bot [DegenTraderV2](https://t.me/DegenTraderV2_bot) that can handle [FTX](https://ftx.com/#a=4341346) orders at lightning speed. If you're a scalper or you just don't like to open the app, choose the market, place your size and press buy or sell ... with this bot it'll be `/buy eth` and you're done!

# Usage
1. Make an account on [FTX](https://ftx.com/#a=4341346) and create a API key
1. Interact with your bot by chatting with it

## Bot Commands
- /info - Info about the bot
- /degen - Increase order by 5x
- /size - Edit your order size
- /balance - Get account balance
- /open - Get open orders
- /buy - Create a buy / long order e.g /buy eth
- /sell - Create a sell / short order e.g /sell eth
- /close - Close all open orders
- /openlimit - Get open limit orders
- /limitbuy - Create a buy / long limit order e.g /limitbuy eth 2000
- /limitsell - Create a sell / short limit order e.g /limitsell eth 5000
- /closelimit - Close all limit orders

# Technical
This bot is made with pure `Javascript` and some ✨

## References
- [FTX API](https://docs.ftx.com/#rest-api)
- [Node Telegram Bot API](https://github.com/yagop/node-telegram-bot-api/)