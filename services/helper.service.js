const CONFIG = require('./../config/config')

/**
 * This function will convert user into into the right contract of the Exchange
 * @param {string} string input command
 * @returns converted string
 */
function convertString(string) {
    return `${string.toUpperCase()}-PERP`;
}

function calculateProfit(entry, mark, side) {
    return (((side === 'buy' ? mark / entry : entry / mark) * 100) - 100).toFixed(3)
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
    return incomingText === checkText || incomingText === (`${checkText}${CONFIG.BOTNAME}`)
}

module.exports = { convertString, checkText, calculateProfit }