const FTXRest = require('ftx-api-rest');
const CONFIG = require('./config');

const ftx = new FTXRest(CONFIG)

/**
 * This will calculate the order size based on the portfolio balance
 * @param {number} percentage how big the order has to be in percentage
 */
async function calculatePortfolio(percentage) {
    let request = ftx.request({
        method: 'GET',
        path: '/wallet/balances'
    })

    let result = await request;

    console.log(result)
}

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
function marketOrder(pair, side, size) {
    ftx.request({
        method: 'POST',
        path: '/orders',
        data: {
            market: convertString(pair),
            size: size,
            side: side,
            type: 'market',
            price: null
        }
    }).then(console.log).catch(err => console.log(err));
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

// marketOrder('btc', 'buy', 0.0001);

// calculatePortfolio()

// closeOrders()