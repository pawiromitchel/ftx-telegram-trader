const fs = require('fs');

async function getData() {
    let rawdata = fs.readFileSync("data.json");
    let apiKeys = JSON.parse(rawdata);
    return apiKeys;
}

async function getOne(chatId) {
    let rawdata = fs.readFileSync("data.json");
    let apiKeys = JSON.parse(rawdata);
    let check = apiKeys.filter(r => r.chatId === chatId);
    return check;
}

async function saveKey(creds) {
    let rawdata = fs.readFileSync("data.json");
    let apiKeys = JSON.parse(rawdata);
    apiKeys.push(creds);
    fs.writeFileSync('data.json', JSON.stringify(apiKeys));
}

async function overWriteKey(creds) {
    let rawdata = fs.readFileSync("data.json");
    let apiKeys = JSON.parse(rawdata);
    let check = apiKeys.filter(r => r.chatId === creds.chatId);
    // overwrite values
    check[0].key = creds.key;
    check[0].secret = creds.secret;
    check[0].subaccount = creds.subaccount;
    fs.writeFileSync('data.json', JSON.stringify(apiKeys));
}

module.exports = { getData, getOne, saveKey, overWriteKey }