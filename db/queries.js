const db = require('./config');
const {getAllIndexes} = require('../utils');
const util = require('util');
const { map } = require('bluebird');

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

async function getInsertedReviewID(idxToInsert, isReviewNull){
    query = `SELECT id
            FROM reviews
            WHERE id >= LAST_INSERT_ID();`;
    let ids = await dbQuery(query).catch(error => {
        throw(error);
    });

    ids = ids.map(id => id['id']);

    let retIds = [];
    for(let i = 0, j = 0; i < idxToInsert.length; i++){
        let idx = idxToInsert[i];
        if(isReviewNull[idx]){
            retIds.push(null);
        }else{
            retIds.push(ids[j]);
            j++;
        }
    }

    return retIds;
}

async function getReviewsToInsert_ProdInDB(productsInDB){

    if(Object.keys(productsInDB).length == 0) 
        return {
            reviewsToInsert_ProdInDB: [],
            idProdToUpdate: [], 
            urlsInDBWithNewReview: []
        };

    const urlsInDBWithNewReview = Object.values(productsInDB).reduce(
        function(obj, product){
            if(product['rating'] != undefined || product['num-reviews'] != undefined)
                obj.push(product['url']);
            return obj;
        }, []);

    // Check products without a review that just got one
    let query = `SELECT id, url 
                FROM products 
                WHERE url IN (?) AND reviewsID IS NULL;`;
    const {idProdToUpdate, urlInDBToInsert} = await dbQuery(query, [urlsInDBWithNewReview])
    .then(res => {
        return res.reduce(
            function(obj, row){
                obj['idProdToUpdate'].push(row['id']);
                obj['urlInDBToInsert'].push(row['url']);
                return obj;
            }, {'idProdToUpdate': [], 'urlInDBToInsert': []}
        );
    })
    .catch(error => {
        throw(error);
    });

    return {
        reviewsToInsert_ProdInDB: urlInDBToInsert.map(url => [productsInDB[url]['rating'], productsInDB[url]['num-reviews']]),
        idProdToUpdate: idProdToUpdate, 
        urlsInDBWithNewReview: urlsInDBWithNewReview
    };

}

function getReviewsToInsert_ProdNotInDB(productsNotInDB){
    return Object.values(productsNotInDB).reduce(
            function(obj, product){
                if(product['rating'] != undefined || product['num-reviews'] != undefined){
                    obj['reviewsToInsert_ProdNotInDB'].push([product['rating'], product['num-reviews']]);
                    obj['hasReview'].push(true);
                }else{
                    obj['hasReview'].push(false);
                }
                return obj;
            }, 
            {'reviewsToInsert_ProdNotInDB': [], 'hasReview': []});
}

function getIdReviewToInsert(ids, len, hasReview){
    const idReviewToInsert = ids.slice(len);

    let idReviewToInsertWithNull = [];
    let j = 0;
    for(let i = 0; i < hasReview.length; i++){
        if(hasReview[i]){
            idReviewToInsertWithNull.push(idReviewToInsert[j]);
            j++;
        }else{
            idReviewToInsertWithNull.push(null);
        }
    }

    return idReviewToInsertWithNull;
}

async function insertReviews(productsInDB, productsNotInDB){

    const {reviewsToInsert_ProdInDB, idProdToUpdate, urlsInDBWithNewReview} = 
        await getReviewsToInsert_ProdInDB(productsInDB);

    const {reviewsToInsert_ProdNotInDB, hasReview} = 
        getReviewsToInsert_ProdNotInDB(productsNotInDB);

    const reviewsToInsert = [...reviewsToInsert_ProdInDB, ...reviewsToInsert_ProdNotInDB];

    if(reviewsToInsert.length == 0) 
        return {
            idProdToUpdate: [], 
            idReviewToUpdate: [], 
            idReviewToInsert: [], 
            urlsInDBWithNewReview: urlsInDBWithNewReview
        };
    
    // Insert
    let query = `INSERT INTO reviews (rating, numReviews) VALUES ?;`;
    await dbQuery(query, [reviewsToInsert])
    .catch(error => {
        throw(error);
    });

    // Get Id of Inserted Values
    query = `SELECT id
            FROM reviews
            WHERE id >= LAST_INSERT_ID();`;
    const ids = await dbQuery(query)
    .then(res => res.map(row => row['id']))
    .catch(error => {
        throw(error);
    });

    const idReviewToUpdate = ids.slice(0, reviewsToInsert_ProdInDB.length);
    const idReviewToInsert = getIdReviewToInsert(ids, reviewsToInsert_ProdInDB.length, hasReview);

    return {
        idProdToUpdate: idProdToUpdate, 
        idReviewToUpdate: idReviewToUpdate, 
        idReviewToInsert: idReviewToInsert, 
        urlsInDBWithNewReview: urlsInDBWithNewReview
    };
}

async function updateReviews(productsInDB, urlsToUpdate){
    if(Object.keys(productsInDB).length == 0 || urlsToUpdate.length == 0) return;

    let query = `SELECT url, reviewsID
                FROM products 
                WHERE url IN (?) AND reviewsID IS NOT NULL`;

    const reviewsToUpdate = await dbQuery(query, [urlsToUpdate])
    .then(res => res.map(row => {
        const product = productsInDB[row['url']];
        return [row['reviewsID'], product['rating'], product['num-reviews']];
    }))
    .catch(error => {
        throw(error);
    });

    // Update
    query = `INSERT INTO reviews 
            (id, rating, numReviews)
            VALUES ? ON DUPLICATE KEY UPDATE
            rating = VALUES(rating), 
            numReviews = VALUES(numReviews);`;

    await dbQuery(query, [reviewsToUpdate])
    .catch(error => {
        throw(error);
    });
}


let categoryTranslation = {
    'Esquentadores': 'Esquentador', 
    'Termoacumuladores': 'Termoacumulador'
};

async function getDistributorIds(productsNotInDB){
    const distributorNames = Object.values(productsNotInDB).map((product) => product['distributor']);
    const uniqueDistributorNames = [ ...new Set(distributorNames)];

    const query = `SELECT id, name
                    FROM distributors
                    WHERE name IN (?);`;

    const distNameToId = await dbQuery(query, [uniqueDistributorNames])
    .then(res => {
        return res.reduce(
            function(ret, el){
                ret[el['name']] = el['id'];
                return ret;
            }, {});
    })
    .catch(error => {
        throw(error);
    });

    return distributorNames.map((distributorName) => distNameToId[distributorName]);
}

async function getCategoryIds(productsNotInDB, distributorIds){
    // TODO: categoryTranslation? How to better deal with that
    const categoryNames = Object.values(productsNotInDB).map((product) => categoryTranslation[product['categories']]);
    const uniqueCategoryNames = [ ...new Set(categoryNames)];

    const query = `SELECT id, name, distributorID
                    FROM categories
                    WHERE name IN (?);`;

    return await dbQuery(query, [uniqueCategoryNames])
        .then(res => {
            return res.reduce(
                function(obj, category){
                    const key = category['name'] + category['distributorID'];
                    obj[key] = category['id'];
                    return obj;
                }, {});
        })
        .then(categoryNameToId => {
            let categoryIds = [];

            for(let i = 0; i < categoryNames.length; i++){
                const key = categoryNames[i] + distributorIds[i];

                if(key in categoryNameToId)
                    categoryIds.push(categoryNameToId[key]);
                else
                    categoryIds.push(null);
            }
            
            return categoryIds;
        })
        .catch(error => {
            throw(error);
        });

}

async function insertProducts(productsNotInDB, idReviewsToInsert){

    if(Object.keys(productsNotInDB).length === 0) return;

    const distributorIds = await getDistributorIds(productsNotInDB);
    const categoryIds = await getCategoryIds(productsNotInDB, distributorIds);
    
    const productsToInsert = Object.values(productsNotInDB).map((product, index) => {
        return [product['name'], product['brand'], product['url'], categoryIds[index], distributorIds[index], idReviewsToInsert[index]];
    });

    query = `INSERT INTO products (name, brand, url, categoryID, distributorID, reviewsID) VALUES ?;`;
    res = await dbQuery(query, [productsToInsert])
    .catch(error => {
        throw(error);
    });
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

function dateToString(date){
    return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
}

async function getChangedPrices(productsInDB, urlToProductId, prodIdToUrl_InDB, today){
    if(Object.keys(productsInDB).length == 0) return {pricesChangedNotSameDay: [], pricesChangedSameDay: []};

    const todayStr = dateToString(today);

    const {prodIdANDPrice, prodId} = Object.values(productsInDB).reduce(
        function(obj, product){
            obj['prodIdANDPrice'].push(urlToProductId[product['url']].toString() + product['price'].toString());
            obj['prodId'].push(urlToProductId[product['url']]);
            return obj;
        }, 
        {prodIdANDPrice: [], prodId: []});

    const query = `
                SELECT m.*
                FROM products p
                INNER JOIN (
                    SELECT *, CONCAT(productID, TRIM(price)+0) AS prodId_Price
                    FROM prices
                ) m
                ON m.productID = p.id
                INNER JOIN (
                    SELECT MAX(date) AS date, productID
                    FROM prices
                    GROUP BY productID
                ) m_newest
                ON m_newest.date = m.date AND m_newest.productID = m.productID
                WHERE m.prodId_Price NOT IN (?)
                    AND m.productID IN (?);`;
    
    return await dbQuery(query, [prodIdANDPrice, prodId])
        .then(prices => {
            return prices.reduce(
                function(obj, price){
                    const url = prodIdToUrl_InDB[price['productID']];

                    if(dateToString(price['date']) == todayStr)
                        obj['pricesChangedSameDay'].push([price['id'], productsInDB[url]['price']]);
                    else                
                        obj['pricesChangedNotSameDay'].push([productsInDB[url]['price'], today, price['productID']]);

                    return obj;

                }, {pricesChangedNotSameDay: [], pricesChangedSameDay: []});
        })
        .catch(error => {
            throw(error);
        });
}

async function getFirstPrices_ProdInDB(productsInDB, prodIdToUrl_InDB, today){

    query = `SELECT DISTINCT productID FROM prices;`;

    return await dbQuery(query)
        .then(prices => {
            return prices.map(price => price['productID']);
        })
        .then(ids => {
            let idsToInsert = Object.keys(prodIdToUrl_InDB);

            for(let i = 0; i < ids.length; i++){
                const index = idsToInsert.indexOf(ids[i].toString());
                if (index > -1)
                    idsToInsert.splice(index, 1);
            }

            return idsToInsert.map(id => {
                const url = prodIdToUrl_InDB[id];
                return [productsInDB[url]['price'], today, id]
            });        
        })
        .catch(error => {
            throw(error);
        });
}

async function insertPrices(productsInDB, productsNotInDB, urlToProductId){

    const today = new Date();

    const pricesToInsert_ProdNotInDB = Object.values(productsNotInDB).map(product => [product['price'], today, urlToProductId[product['url']]]);

    const prodIdToUrl_InDB = Object.keys(productsInDB).reduce(
        function(prodIdToUrl, url){
            prodIdToUrl[urlToProductId[url]] = url;
            return prodIdToUrl;
        }, {}
    );

    const {pricesChangedNotSameDay, pricesChangedSameDay} = await getChangedPrices(productsInDB, urlToProductId, prodIdToUrl_InDB, today);
    const newPricesToInsert_ProdInDB = await getFirstPrices_ProdInDB(productsInDB, prodIdToUrl_InDB, today);

    const pricesToInsert = [...pricesChangedNotSameDay, ...newPricesToInsert_ProdInDB, ...pricesToInsert_ProdNotInDB];

    // Insert
    if(pricesToInsert.length > 0){
        query = `INSERT INTO prices (price, date, productID) VALUES ?;`;
        await dbQuery(query, [pricesToInsert])
        .catch(error => {
            throw(error);
        });
    }

    return pricesChangedSameDay;
}

async function updatePrices(pricesToUpdate){
    if(pricesToUpdate.length == 0) return;

    query = `INSERT INTO prices 
            (id, price)
            VALUES ? ON DUPLICATE KEY UPDATE
            price = VALUES(price);`;
    
    await dbQuery(query, [pricesToUpdate])
    .catch(error => {
        throw(error);
    });
}

async function updateProducts(idProdToUpdate, idReviewToUpdate){
    if(idProdToUpdate.length == 0) return;

    let productPropsToUpdate = [];
    for(let i = 0; i < idProdToUpdate.length; i++){
        productPropsToUpdate.push([idProdToUpdate[i], idReviewToUpdate[i]]);
    }
    
    const query = `INSERT INTO products 
            (id, reviewsID)
            VALUES ? ON DUPLICATE KEY UPDATE
            reviewsID = VALUES(reviewsID);`;
    
    const urlsInDB = await dbQuery(query, [productPropsToUpdate])
    .catch(error => {
        throw(error);
    });
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

function getAttributeType(str){
    if(isNaN(str))
        return 'String';
    else
        return 'Number';
}

async function insertProductAttributes(productsNotInDB, urlToProductId){
    let prodAttributesToInsert = [];

    Object.values(productsNotInDB).forEach(product => {
        if(!('more-details' in product)) return;

        const productId = urlToProductId[product['url']];
        const prodAttributes = product['more-details'];

        const singleProdAttributesToInsert = Object.entries(prodAttributes).map(([attributeKey, attributeValue]) => {
            return [attributeKey, attributeValue, getAttributeType(attributeValue), productId];
        });

        prodAttributesToInsert = [...prodAttributesToInsert, ...singleProdAttributesToInsert];
    });

    if(prodAttributesToInsert.length == 0) return;

    query = `INSERT INTO productAttributes (attributeName, value, datatype, productID) VALUES ?;`;
    await dbQuery(query, [prodAttributesToInsert])
    .catch(error => {
        throw(error);
    });
}

// Insert Product Rows
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