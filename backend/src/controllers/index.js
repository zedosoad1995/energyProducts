const { getWortenProducts } = require('../services/scrape/worten.service');
const { getAllAtributeNames, ProductsQuery } = require('../services/products.service');
const Promise = require("bluebird");
const {getProductCatalogUrls, updateDBWithScrapedProducts, getProductUrlsInDB} = require('../db/queries');
const {getHeader} = require('../services/utils/dataManipulation');

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
        res.sendStatus(500) && next(error);
        console.error(error);
        throw new Error('Bad Request Scraping Products');
    });

    await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)
    .catch(error => {
        console.log(error);
    });

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

        res.status(200).json({
            products,
            maxSize,
            attributeTypes,
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