const HELPER = require('./helper.service');

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
async function closeOrders(API_CONNECTION, pair = '') {
    let onlyPositionsWithSize = await openOrders(API_CONNECTION);

    if (pair) {
        onlyPositionsWithSize = onlyPositionsWithSize.filter(position => position.future.toLowerCase().includes(pair.toLowerCase()))
    }

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
async function closeLimitOrders(API_CONNECTION, pair = '') {
    let request = {
        method: 'DELETE',
        path: '/orders'
    }

    if (pair) {
        request.data = { market: HELPER.convertString(pair) }
    }
    return API_CONNECTION.request(request);
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

module.exports = { getBalance, getPrice, calculatePortfolio, marketOrder, openOrders, openLimitOrders, closeOrders, closeLimitOrders, fundingRate }