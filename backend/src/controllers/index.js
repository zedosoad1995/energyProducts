const { WortenScraper } = require('../services/scrape/worten.service');
const { AuchanScraper } = require('../services/scrape/auchan.service');

const { getAllAtributeNames, ProductsQuery } = require('../services/products.service');
const Promise = require("bluebird");
const {
    getProductCatalogUrls, 
    updateDBWithScrapedProducts, 
    getProductUrlsInDB, 
    getProductAttrNames
} = require('../db/queries');
const {logger} = require('../utils/logger');


async function scrape(req, res, next){

    const distributor = req.body.distributor

    logger.info(`Starting scraping of ${distributor}...`);

    try{
        let urls = await getProductCatalogUrls(distributor)
        urls = [...new Set(urls)]

        const {urlsWithAttributes, urlsNoAttributes} = await getProductUrlsInDB(distributor)

        const prodAttrNames = await getProductAttrNames(distributor).then(Object.keys)

        // scrape products
        let scraper
        if(distributor === 'Worten'){
            scraper = new WortenScraper(urlsWithAttributes, prodAttrNames);
        }else if(distributor === 'Auchan'){
            scraper = new AuchanScraper(prodAttrNames);
        }else{
            res.sendStatus(404);
        }

        /* const scrapedProds = await Promise.map(urls,
                url => scraper.getProducts(url),
                { concurrency: 2 }
            )
            .then(res => [].concat.apply([], res)); */

        let scrapedProds = []
        for(url of urls){
            scrapedProds = [...scrapedProds, ...await scraper.getProducts(url)]
        }

        await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)
    }catch(err){
        res.sendStatus(500);
        logger.error(err + '\n')
        next(err);
        return;
    }

    logger.info(`${distributor} products successfully scraped.\n`);

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
    scrape,
    getProducts,
    getAllAttrNames
}