const db = require('./config');
const util = require('util');

const {insertReviews, updateReviews} = require('./insertUpdateProdHelper/reviews');
const {insertProducts, updateProducts} = require('./insertUpdateProdHelper/products');
const {insertPrices, updatePrices} = require('./insertUpdateProdHelper/prices');
const {insertProductAttributes} = require('./insertUpdateProdHelper/productAttributes');

const dbQuery = util.promisify(db.query).bind(db);

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

    const res = await dbQuery(query, [dist]).catch(error => {
        throw(error);
    })

    return JSON.parse(JSON.stringify(res));
}

async function getProductsInDB(products){
    const urls = products.map(product => product['url']);
    let query = `SELECT url
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

async function updateInsertProducts(products){

    const {productsInDB, productsNotInDB} = await getProductsInDB(products);

    const {idProdToUpdate, idReviewToUpdate, idReviewToInsert, urlsInDBWithNewReview} = 
        await insertReviews(productsInDB, productsNotInDB);
    await updateReviews(productsInDB, urlsInDBWithNewReview);

    await insertProducts(productsNotInDB, idReviewToInsert);
    await updateProducts(idProdToUpdate, idReviewToUpdate);

    const urlToProductId = await getUrlToProductId();

    const pricesChangedSameDay = await insertPrices(productsInDB, productsNotInDB, urlToProductId);
    await updatePrices(pricesChangedSameDay);

    await insertProductAttributes(productsNotInDB, urlToProductId)

}

module.exports = {
    getAllProductUrls,
    getProductUrlsByDistributor,
    updateInsertProducts
}