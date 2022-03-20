const { getWortenProducts } = require('../services/scrape/worten.service');
const { getAllAtributeNames, ProductsQuery } = require('../services/products.service');
const Promise = require("bluebird");
const {getProductCatalogUrls, updateDBWithScrapedProducts, getProductUrlsInDB} = require('../db/queries');
const {getHeader} = require('../services/utils/dataManipulation');
const {logger} = require('../utils/logger')

async function wortenScraper(_, res, next){

    logger.info(`Starting scraping of Worten...`);

    const urls = await getProductCatalogUrls('Worten')
    .catch((err) => {
        res.sendStatus(500)
        logger.error(err)
        throw err;
    });

    const {urlsWithAttributes, urlsNoAttributes} = await getProductUrlsInDB('Worten')
    .catch((err) => {
        res.sendStatus(500)
        logger.info(err)
        throw err;
    });

    // scrape products
    const scrapedProds = await Promise.map(urls,
        url => getWortenProducts(url, urlsWithAttributes),
        { concurrency: 2 }
    )
    .then(res => [].concat.apply([], res))
    .catch((err) => {
        res.sendStatus(500) && next(error);
        logger.error(err)
        throw new Error('Bad Request Scraping Products');
    });

    await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)
    .catch(err => {
        logger.error(err)
    });

    logger.info(`Worten products successfully scraped.`);

    res.sendStatus(201);
}

async function getProducts(req, res, next){
    const limit = parseInt(req.query.limit);
    const offset = parseInt(req.query.offset);

    await ProductsQuery.initializeMainQuery(req.body.tableOptions);

    try {
        const products = await ProductsQuery.getProducts(limit, offset);
        const header = ProductsQuery.getHeader();
        const maxSize = await ProductsQuery.getNumRows();
        const attributeTypes = await ProductsQuery.getAttributeTypes();
        const attributeRanges = await ProductsQuery.getAttributeRanges();

        res.status(200).json({
            products,
            maxSize,
            attributeTypes,
            attributeRanges,
            header,
            limit,
            offset
        });

    } catch(error) {
        console.error(error);
        res.status(400).send('Bad Request');
    }
}

async function getAllAttrNames(req, res, next){
    await getAllAtributeNames()
    .then(names => {
        res.status(200).send(names);
    })
    .catch(error => {
        console.error(error);
        res.status(400).send('Bad Request');
    });
}

module.exports = {
    wortenScraper,
    getProducts,
    getAllAttrNames
}