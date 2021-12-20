const { getWortenProducts } = require('../services/wortenService');
const Promise = require("bluebird");
const {getProductUrlsByDistributor, updateInsertProducts, getUrlsInDB} = require('../db/queries');

const wortenScraper = async (req, res, next) => {
    const urls = await getProductUrlsByDistributor('Worten')
    .then(results => results.map(result => result['fullUrl']))
    .catch((err) => {
        res.sendStatus(500)
        throw err;
    });

    const {urlsWithAttributes, urlsNoAttributes} = await getUrlsInDB()
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
        return;
    });

    await updateInsertProducts(scrapedProds, urlsNoAttributes).catch(error => {
        console.log(error);
    });

    res.sendStatus(201);
}

module.exports = {
    wortenScraper
}