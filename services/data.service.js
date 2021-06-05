const fs = require('fs');
const DB_PATH = './db/data.json';

async function getData() {
    let rawdata = fs.readFileSync(DB_PATH);
    let apiKeys = JSON.parse(rawdata);
    return apiKeys;
}

async function getOne(chatId) {
    let rawdata = fs.readFileSync(DB_PATH);
    let apiKeys = JSON.parse(rawdata);
    let check = apiKeys.filter(r => r.chatId === chatId);
    return check;
}

async function saveKey(creds) {
    let rawdata = fs.readFileSync(DB_PATH);
    let apiKeys = JSON.parse(rawdata);
    apiKeys.push(creds);
    fs.writeFileSync(DB_PATH, JSON.stringify(apiKeys));
}

async function overWriteKey(creds) {
    let rawdata = fs.readFileSync(DB_PATH);
    let apiKeys = JSON.parse(rawdata);
    let check = apiKeys.filter(r => r.chatId === creds.chatId);
    // overwrite values
    check[0].key = creds.key;
    check[0].secret = creds.secret;
    check[0].subaccount = creds.subaccount;
    fs.writeFileSync(DB_PATH, JSON.stringify(apiKeys));
}

async function setOrderSize(chatId, size) {
    let rawdata = fs.readFileSync(DB_PATH);
    let apiKeys = JSON.parse(rawdata);
    let check = apiKeys.filter(r => r.chatId === chatId);
    // overwrite values
    check[0].orderSize = size;
    fs.writeFileSync(DB_PATH, JSON.stringify(apiKeys));
}

async function setDegenMode(chatId, degen) {
    let rawdata = fs.readFileSync(DB_PATH);
    let apiKeys = JSON.parse(rawdata);
    let check = apiKeys.filter(r => r.chatId === chatId);
    // overwrite values
    check[0].degen = degen;
    fs.writeFileSync(DB_PATH, JSON.stringify(apiKeys));
}

module.exports = { getData, getOne, saveKey, overWriteKey, setOrderSize, setDegenMode }