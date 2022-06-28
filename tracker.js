const axios = require("axios");
var airtableInstance = require("airtable");

const ONE_MINUTE = 1000 * 60;
const TEN_MINUTES = 1000 * 60 * 10;
const MIN_INTERNAL_SERVER_ERROR = 500;
const MAX_INTERNAL_SERVER_ERROR = 600;
const CURRENY_RATE = "USD";
const BITCOIN_PRICE_URL = "https://blockchain.info/de/ticker";
const TABLE_NAME = "BTC Table";

let failedRecords = [];
var base = new airtableInstance({ apiKey: "" }).base("appnbrP51UDKCob3f");

// check bitcoin price every one minute
setInterval(mainFunc, ONE_MINUTE);

async function mainFunc() {
  try {
    const currentBitcoinPrice = await getBitcoinPrice();
    await WriteToAirTable(currentBitcoinPrice);
  } catch (err) {
    console.error(err);
  }
}

async function WriteToAirTable(bitcoinPrice) {
  return new Promise((resolve, reject) => {
    const dataToSave = {
      fields: {
        Time: Date.now(),
        Rates: bitcoinPrice,
      },
    };
    base(TABLE_NAME).create([dataToSave], function (err) {
      if (err) {
        if (
          err.statusCode >= MIN_INTERNAL_SERVER_ERROR &&
          err.statusCode < MAX_INTERNAL_SERVER_ERROR
        ) {
          failedRecords.push(dataToSave);
          tryUpdateFailedItems().catch((err) => reject(err));
        } else reject(err);
      } else resolve();
    });
  });
}

async function tryUpdateFailedItems() {
  return new Promise((resolve, reject) => {
    base(TABLE_NAME).create(failedRecords, function (err) {
      if (err) {
        if (
          err.statusCode >= MIN_INTERNAL_SERVER_ERROR &&
          err.statusCode < MAX_INTERNAL_SERVER_ERROR
        ) {
          setTimeout(async () => {
            tryUpdateFailedItems().catch((err) => reject(err));
          }, TEN_MINUTES);
        } else reject(err);
      } else {
        failedRecords = [];
        resolve();
      }
    });
  });
}

async function getBitcoinPrice() {
  const res = await axios.get(BITCOIN_PRICE_URL);
  return res.data[CURRENY_RATE].last;
}
