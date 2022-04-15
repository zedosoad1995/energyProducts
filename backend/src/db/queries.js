const db = require('./config');
const util = require('util');
const {logger} = require('../utils/logger')

const {fillReviews} = require('./insertUpdateProdHelper/reviews');
const {fillProducts} = require('./insertUpdateProdHelper/products');
const {fillPrices} = require('./insertUpdateProdHelper/prices');
const {fillProductAttributes} = require('./insertUpdateProdHelper/productAttributes');

const dbQuery = util.promisify(db.query).bind(db);
const dbBeginTransaction = util.promisify(db.beginTransaction).bind(db);
const dbCommit = util.promisify(db.commit).bind(db);
const dbRollback = util.promisify(db.rollback).bind(db);

// TODO: optional parameters dist
// Get urls by distributor
async function getProductCatalogUrls(dist){
    const query =   `SELECT dist.name AS distributorName, cat.name AS categoryName, CONCAT(dist.url, cat.url) AS fullUrl
                    FROM categories cat
                    INNER JOIN distributors dist
                        ON cat.distributorID = dist.id
                    WHERE dist.name IN (?);`;

    const res = await dbQuery(query, [dist])
    .then(results => results.map(result => result['fullUrl']))
    .catch(error => {
        throw error;
    })

    return JSON.parse(JSON.stringify(res));
}

async function getProductUrlsInDB(dist){
    const query = `SELECT prod.url AS url,
        	        CASE
                        WHEN attr.productID IS NULL THEN FALSE
                        ELSE TRUE
                    END AS hasAttributes
                    FROM products prod
                    LEFT JOIN (
                        SELECT DISTINCT productID
                        FROM productAttributes
                    ) attr
                        ON prod.id = attr.productID
                    INNER JOIN distributors dist
                        ON prod.distributorID = dist.id
                    WHERE dist.name IN (?);`;
    
    return await dbQuery(query, [dist])
        .then(urls => {
            return urls.reduce((urlsObj, url) => {
                if(url['hasAttributes'])
                    urlsObj['urlsWithAttributes'].push(url['url']);
                else
                    urlsObj['urlsNoAttributes'].push(url['url']);
                
                return urlsObj;
            }, 
            {urlsWithAttributes: [], urlsNoAttributes: []});
        })
        .catch(error => {
            throw(error);
        });
}

async function getProductAttrNames(distributor){
    const query = `
        SELECT DISTINCT attributeName, datatype
        FROM productAttributes pa
        INNER JOIN products p
            ON p.id = pa.productID
        INNER JOIN distributors dist
            ON p.distributorID = dist.id
        WHERE dist.name = ? OR ?;`;

    const showAll = distributor ? false : true

    return dbQuery(query, [distributor, showAll])
        .then(attrs => attrs.reduce((obj, val) => {
            obj[val['attributeName']] = val['datatype'];
            return obj;
        }, {}))
        .catch(error => {
            throw(error);
        });
}

// TODO: what if url is undefined??? tratar desse caso, alterar codigo para acomidar isso.
async function getProductsInDB(products){
    const urls = products.map(product => product['url']);

    const query = `SELECT url
                FROM products
                WHERE url IN (?);`;
    const urlsInDB = await dbQuery(query, [urls])
    .then(urls => urls.map(url => url['url']))
    .catch(error => {
        throw(error);
    });

    return products.reduce((obj, product) => {
            if(urlsInDB.includes(product['url'])){
                obj['productsInDB'][product['url']] = product;
            }else{
                obj['productsNotInDB'][product['url']] = product;
            }
            return obj;
            }, 
            {'productsInDB': {}, 'productsNotInDB': {}}
        );
}

// TODO: urls cannot be null? What about other websites?
async function getUrlToProductId(){
    const query = `SELECT id, url
                    FROM products;`;

    return dbQuery(query)
        .then(res => {
            return res.reduce((urlToProductId, product) => {
                    urlToProductId[product['url']] = product['id'];
                    return urlToProductId;
                }, {}
            );
        })
        .catch(error => {
            throw(error);
        });
}

async function updateDBWithScrapedProducts(products, urlsNoAttributes){
    if(products.length == 0) return;
    
    try{
        await dbBeginTransaction()
        .then(async () => {

            const {productsInDB, productsNotInDB} = await getProductsInDB(products)

            logger.info(`# of existing products being scraped: ${Object.keys(productsInDB).length}`);
            logger.info(`# of new products being scraped: ${Object.keys(productsNotInDB).length}`); 

            const {idReviewToUpdate, idReviewToInsert, idProdToUpdate} = await fillReviews(productsInDB, productsNotInDB);

            await fillProducts(productsNotInDB, idReviewToInsert, idProdToUpdate, idReviewToUpdate);

            const urlToProductId = await getUrlToProductId()

            await fillPrices(productsInDB, productsNotInDB, urlToProductId);

            const productsInDBWithNewAttr = Object.fromEntries(
                Object.entries(productsInDB).filter(
                ([prodKey,]) => urlsNoAttributes.includes(prodKey)
                )
            );
            await fillProductAttributes(productsNotInDB, urlToProductId, productsInDBWithNewAttr);

            await dbCommit();
        });
    }catch(error){
        await dbRollback()
        .catch(rollbackError => {throw(rollbackError)});
        throw(error);
    }
}

module.exports = {
    getProductCatalogUrls,
    updateDBWithScrapedProducts,
    getProductUrlsInDB,
    getProductsInDB,
    getUrlToProductId,
    getProductAttrNames
}