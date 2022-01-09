const db = require('./config');
const util = require('util');

const {insertReviews, updateReviews, getInsertedIds_Reviews} = require('./insertUpdateProdHelper/reviews');
const {insertProducts, updateProducts} = require('./insertUpdateProdHelper/products');
const {insertPrices, updatePrices} = require('./insertUpdateProdHelper/prices');
const {insertProductAttributes} = require('./insertUpdateProdHelper/productAttributes');

const dbQuery = util.promisify(db.query).bind(db);
const dbBeginTransaction = util.promisify(db.beginTransaction).bind(db);
const dbCommit = util.promisify(db.commit).bind(db);

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
            if(urlsInDB.includes(product['url']))
                obj['productsInDB'][product['url']] = product;
            else
                obj['productsNotInDB'][product['url']] = product;
            return obj;
            }, 
            {'productsInDB': {}, 'productsNotInDB': {}}
        );
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

    const urlsInDBWithNewReview = Object.values(productsInDB)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);
    
    await dbBeginTransaction()
    .then(async () => {
        const {idProdToUpdate, hasReview} = await insertReviews(productsInDB, productsNotInDB, urlsInDBWithNewReview);
        await updateReviews(productsInDB, urlsInDBWithNewReview);

        const {idReviewToUpdate, idReviewToInsert} = await getInsertedIds_Reviews(idProdToUpdate.length, hasReview);

        await insertProducts(productsNotInDB, idReviewToInsert);
        await updateProducts(idProdToUpdate, idReviewToUpdate);

        const urlToProductId = await getUrlToProductId()

        const pricesChangedSameDay = await insertPrices(productsInDB, productsNotInDB, urlToProductId)
        await updatePrices(pricesChangedSameDay)

        const productsInDBWithNewAttr = Object.fromEntries(
            Object.entries(productsInDB).filter(
               ([prodKey,]) => urlsNoAttributes.includes(prodKey)
            )
         );
         await insertProductAttributes(productsNotInDB, urlToProductId, productsInDBWithNewAttr);

         await dbCommit();

    })
    .catch(error => {
        db.rollback(function() {
            throw error;
        });
    });
}

module.exports = {
    getProductCatalogUrls,
    updateInsertProducts,
    getProductUrlsInDB,
    getProductsInDB
}