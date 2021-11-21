const { getWortenProducts } = require('../services/wortenService');
const Promise = require("bluebird");
const fs = require('fs');
const {getAllProductUrls, getProductUrlsByDistributor} = require('../db/queries');

const urls = require('../resources/urlsToScrape.json');
var wortenPath = "./resources/wortenData.json";


const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data));
    } catch(error) {
        throw new Error(error);
    }
}

const loadData = (path) => {
    try {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        }else{
            return [];
        }
    } catch (error) {
        throw new Error(error);
    }
}

const wortenScraper = async (req, res, next) => {

    // load data
    try {
        var scrapedProducts = loadData(wortenPath);
    } catch(error) {
        console.log(error);
        res.sendStatus(500);
        return;
    }

    var urls;
    await getProductUrlsByDistributor('Worten').then((results) => {
        urls = results.map(result => {
            return result['fullUrl'];
        })
    }).catch((err) => {
        res.sendStatus(500)
        throw err;
    });

    // scrape products
    await Promise.map(urls,
        url => getWortenProducts(url, scrapedProducts),
        { concurrency: 2 }
    ).catch((error) => {
        console.log(error);
        res.sendStatus(500) && next(error);
        return;
    });

    // save data
    try {
        storeData(scrapedProducts, wortenPath);
    } catch(error) {
        console.log(error);
        res.sendStatus(500);
        return;
    }

    res.sendStatus(201);

}

module.exports = {
    wortenScraper
}