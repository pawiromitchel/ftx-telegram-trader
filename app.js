const FTXRest = require('ftx-api-rest');
const CONFIG = require('./config');

const ftx = new FTXRest(CONFIG)

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

calculatePortfolio(10, 'eth');

// closeOrders()