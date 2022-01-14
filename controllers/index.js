const { getWortenProducts } = require('../services/wortenService');
const Promise = require("bluebird");
const {getProductCatalogUrls, updateDBWithScrapedProducts, getProductUrlsInDB} = require('../db/queries');

const wortenScraper = async (_, res, next) => {
    const urls = await getProductCatalogUrls('Worten')
    .catch((err) => {
        res.sendStatus(500)
        throw err;
    });

    const {urlsWithAttributes, urlsNoAttributes} = await getProductUrlsInDB('Worten')
    .catch((err) => {
        res.sendStatus(500)
        throw err;
    });

    // scrape products
    const scrapedProds = await Promise.map(urls,
        url => getWortenProducts(url, urlsWithAttributes),
        { concurrency: 2 }
    )
    .then(res => [].concat.apply([], res))
    .catch((error) => {
        console.log(error);
        res.sendStatus(500) && next(error);
        throw error;
    });

    await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)
    .catch(error => {
        console.log(error);
    });

    res.sendStatus(201);
}

module.exports = {
    wortenScraper
}