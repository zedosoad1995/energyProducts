const db = require('./config');
const util = require('util');

const {insertReviews, updateReviews} = require('./insertUpdateProdHelper/reviews');
const {insertProducts, updateProducts} = require('./insertUpdateProdHelper/products');
const {insertPrices, updatePrices} = require('./insertUpdateProdHelper/prices');
const {insertProductAttributes} = require('./insertUpdateProdHelper/productAttributes');

const dbQuery = util.promisify(db.query).bind(db);
const dbBeginTransaction = util.promisify(db.beginTransaction).bind(db);
const dbCommit = util.promisify(db.commit).bind(db);

// Get all urls
async function getAllProductUrls(){
    const query =   `SELECT dist.name AS distributorName, cat.name AS categoryName, CONCAT(dist.url, cat.url) AS fullUrl
                    FROM categories cat
                    INNER JOIN distributors dist
                    ON cat.distributorID = dist.id;`;

    const res = await dbQuery(query).catch(error => {
        throw(error);
    })

    return JSON.parse(JSON.stringify(res));
}

// Get urls by distributor
async function getProductUrlsByDistributor(dist){
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

async function getUrlsInDB(){
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
                        ON prod.id = attr.productID;`;
    
    return await dbQuery(query)
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

async function getProductsInDB(products){
    const urls = products.map(product => product['url']);
    const query = `SELECT url
                FROM products
                WHERE url IN (?);`;
    const urlsInDB = await dbQuery(query, [urls])
    .then(res => 
        res.reduce(
            function(obj, newRow){
                obj.push(newRow['url']);
                return obj;
            }, []
        )
    )
    .catch(error => {
        throw(error);
    });

    const productsDict = products.reduce(
        function(obj, product){
            if(urlsInDB.includes(product['url']))
                obj['productsInDB'][product['url']] = product;
            else
                obj['productsNotInDB'][product['url']] = product;
            return obj;
        }, {'productsInDB': {}, 'productsNotInDB': {}}
    );

    return {
        productsInDB: productsDict['productsInDB'], 
        productsNotInDB: productsDict['productsNotInDB']
    };
}

async function getUrlToProductId(){
    const query = `SELECT id, url
                    FROM products;`;

    return await dbQuery(query)
        .then(res => {
            return res.reduce(
                function(urlToProductId, product){
                    urlToProductId[product['url']] = product['id'];
                    return urlToProductId;
                }, {}
            );
        })
        .catch(error => {
            throw(error);
        });
}

async function updateInsertProducts(products, urlsNoAttributes){
    if(products.length == 0) return;

    const {productsInDB, productsNotInDB} = await getProductsInDB(products);
    
    await dbBeginTransaction();
    
    const {idProdToUpdate, idReviewToUpdate, idReviewToInsert, urlsInDBWithNewReview} = 
        await insertReviews(productsInDB, productsNotInDB)
        .catch(error => {
            db.rollback(function() {
                throw error;
            });
        });
    await updateReviews(productsInDB, urlsInDBWithNewReview)
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });

    await insertProducts(productsNotInDB, idReviewToInsert)
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });
    await updateProducts(idProdToUpdate, idReviewToUpdate)
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });

    const urlToProductId = await getUrlToProductId()
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });

    const pricesChangedSameDay = await insertPrices(productsInDB, productsNotInDB, urlToProductId)
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });
    await updatePrices(pricesChangedSameDay)
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });

    const productsInDBWithNewAttr = Object.fromEntries(
        Object.entries(productsInDB).filter(
           ([prodKey,]) => urlsNoAttributes.includes(prodKey)
        )
     );

    await insertProductAttributes(productsNotInDB, urlToProductId, productsInDBWithNewAttr)
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });

    dbCommit()
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });
}

module.exports = {
    getAllProductUrls,
    getProductUrlsByDistributor,
    updateInsertProducts,
    getUrlsInDB
}