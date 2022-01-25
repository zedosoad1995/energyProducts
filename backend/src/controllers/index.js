const { getWortenProducts } = require('../services/scrape/worten.service');
const { getProductsForDisplay } = require('../services/products.service');
const Promise = require("bluebird");
const {getProductCatalogUrls, updateDBWithScrapedProducts, getProductUrlsInDB} = require('../db/queries');

async function wortenScraper(_, res, next){
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

async function getProducts(req, res, next){
    await getProductsForDisplay(req.body.tableOptions, req.body.limit, req.body.skip)
    .then(prods => {
        res.status(200).json({
            products: prods,
            header: Object.keys(prods[0])
        });
    })
    .catch(error => {
        console.error(error);
        res.status(400).send('Bad Request');
    });
}

module.exports = {
    wortenScraper,
    getProducts
}