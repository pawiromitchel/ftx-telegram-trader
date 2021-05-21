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

function marketOrder(pair) {
    ftx.request({
        method: 'POST',
        path: '/orders',
        data: {
            market: convertString(pair),
            size: 0.001,
            side: 'buy',
            type: 'market',
            price: null
        }
    }).then(console.log).catch(console.log);
}

async function closeOrders(pair) {
    let request = ftx.request({
        method: 'GET',
        path: '/positions'
    });

    let result = await request;
    let onlyPositionsWithSize = result.result.filter(pos => pos.size !== 0);
    console.log(onlyPositionsWithSize)

    // ftx.request({
    //     method: 'POST',
    //     path: '/orders',
    //     data: {
    //         market: 'ETH-PERP',
    //         size: 0.001,
    //         side: 'sell',
    //         type: 'market',
    //         price: null
    //     }
    // }).then(console.log).catch(console.log);
}

// marketOrder('eth');

// calculatePortfolio()

closeOrders()