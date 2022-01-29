const { getWortenProducts } = require('../services/scrape/worten.service');
const { getProductsForDisplay, getProductAttrNames } = require('../services/products.service');
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
    const limit = parseInt(req.query.limit);
    const offset = parseInt(req.query.offset);

    // TODO: function to obtain header
    await getProductsForDisplay(req.body.tableOptions, limit, offset)
    .then(prods => {
        res.status(200).json({
            products: prods['data'],
            maxSize: prods['maxSize'],
            attributeTypes: prods['attributeTypes'],
            header: req.body['tableOptions']['attributesToDisplay'],
            limit: limit,
            offset: offset
        });
    })
    .catch(error => {
        console.error(error);
        res.status(400).send('Bad Request');
    });
}

async function getAllAttrNames(req, res, next){
    await getProductAttrNames()
    .then(names => {
        // Por estes nomes de uma forma centralizada, talvez no service (business logic)
        const otherNames = ['name', 'distributor', 'category', 'rating', 'numReviews', 'price', 'url', 'marca'];
        names = names.concat(...otherNames);
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