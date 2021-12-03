const db = require('./config');
const {getAllIndexes} = require('../utils');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

// Get all urls
async function getAllProductUrls(){
    const query =   `
                    SELECT dist.name AS distributorName, cat.name AS categoryName, CONCAT(dist.url, cat.url) AS fullUrl
                    FROM categories cat
                    INNER JOIN distributors dist
                    ON cat.distributorID = dist.id;
                    `;

    const res = await dbQuery(query).catch(error => {
        throw(error);
    })

    return JSON.parse(JSON.stringify(res));
}

// Get urls by distributor
async function getProductUrlsByDistributor(dist){
    const query =   `
                    SELECT dist.name AS distributorName, cat.name AS categoryName, CONCAT(dist.url, cat.url) AS fullUrl
                    FROM categories cat
                    INNER JOIN distributors dist
                    ON cat.distributorID = dist.id
                    WHERE dist.name IN (?);
                    `;

    const res = await dbQuery(query, [dist]).catch(error => {
        throw(error);
    })

    return JSON.parse(JSON.stringify(res));
}

// Insert Review Row
/*async function insertReviewsRow(rating, numReviews){
    const query =   `
                    INSERT INTO reviews (rating, numReviews)
                    VALUES (?, ?)
                    `;

    const res = await dbQuery(query, [rating, numReviews]).catch(error => {
        throw(error);
    })
}*/

// Insert Distributors Row
async function insertDistributorsRow(name, url){
    const query =   `
                    INSERT INTO reviews (name, url)
                    VALUES (?, ?)
                    `;

    const res = await dbQuery(query, [name, url]).catch(error => {
        throw(error);
    })
}

// Insert Category Row
async function insertCategoriesRow(name, url, distributorID){
    const query =   `
                    INSERT INTO categories (name, url, distributorID)
                    VALUES (?, ?, ?);
                    `;

    const res = await dbQuery(query, [name, url, distributorID]).catch(error => {
        throw(error);
    })
}

// Insert Prices Row
async function insertPricesRow(price, date){
    const query =   `
                    INSERT INTO prices (price, date)
                    VALUES (?, ?)
                    `;

    const res = await dbQuery(query, [price, date]).catch(error => {
        throw(error);
    })
}

// Insert Products Row
async function insertProductsRow(name, brand, url, categoryID, reviewsID, distributorID, priceID){
    const query =   `
                    INSERT INTO products (name, brand, url, categoryID, reviewsID, distributorID, priceID)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    `;

    const res = await dbQuery(query, [name, brand, url, categoryID, reviewsID, distributorID, priceID]).catch(error => {
        throw(error);
    })
}

// Insert Prices Row
async function insertPricesRow(price, date){
    const query =   `
                    INSERT INTO prices (price, date)
                    VALUES (?, ?);
                    `;

    const res = await dbQuery(query, [price, date]).catch(error => {
        throw(error);
    })
}

// Insert ProductAttributeTypes Row
async function insertProductAttributeTypesRow(attributeName, datatype){
    const query =   `
                    INSERT INTO productAttributeTypes (attributeName, datatype)
                    VALUES (?, ?);
                    `;

    const res = await dbQuery(query, [attributeName, datatype]).catch(error => {
        throw(error);
    })
}

// Insert ProductAttributes Row
async function insertProductAttributesRow(value, productID, productAttribTypeID){
    const query =   `
                    INSERT INTO productAttributes (value, productID, productAttribTypeID)
                    VALUES (?, ?, ?);
                    `;

    const res = await dbQuery(query, [value, productID, productAttribTypeID]).catch(error => {
        throw(error);
    })
}

async function getInsertedReviewID(idxToInsert, isReviewNull){
    query = `SELECT id
            FROM reviews
            WHERE id >= LAST_INSERT_ID();`;
    let ids = await dbQuery(query).catch(error => {
        throw(error);
    });

    ids = JSON.parse(JSON.stringify(ids)).map(id => id['id']);

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

async function insertReviews(reviewsProps, idxToInsert, isReviewNull){
    if(idxToInsert.length == 0) return;

    let propsToInsert = idxToInsert.reduce(
        function (ret, i) {
            if(!isReviewNull[i])
                ret.push(reviewsProps[i]);
            return ret;
        }, []);

    if(propsToInsert.length == 0) return;
    
    query = `INSERT INTO reviews (rating, numReviews) VALUES ?;`;
    const res = await dbQuery(query, [propsToInsert]).catch(error => {
        throw(error);
    });
}

async function updateReviews(reviewsProps, reviewsID, idxToUpdate, isReviewNull){
    if(idxToUpdate.length == 0) return;

    let propsToUpdate = idxToUpdate.reduce(
        function (ret, i) {
            if(!isReviewNull[i])
                ret.push([reviewsID[counter], ...reviewsProps[i]]);
            return ret;
        }, []);

    if(propsToUpdate.length == 0) return;

    query = `INSERT INTO reviews 
            (id, rating, numReviews)
            VALUES `;
    propsToUpdate.forEach(props => {
        query += "(" + props.join(", ") + "), ";
    });
    query = query.substring(0, query.length - 2);
    query += ` ON DUPLICATE KEY UPDATE 
            rating = VALUES(rating), 
            numReviews = VALUES(numReviews);`;

    const res = await dbQuery(query).catch(error => {
        throw(error);
    });
}


let categoryTranslation = {
    'Esquentadores': 'Esquentador', 
    'Termoacumuladores': 'Termoacumulador'
};


async function insertProducts(products, reviewsID, idxToInsert){

    // get distributorMap
    let distributors = idxToInsert.map((idxProduct) => products[idxProduct]['distributor']);
    let uniqueDistributors = [ ...new Set(distributors)];

    let query = `SELECT id, name
            FROM distributors
            WHERE name IN (?);`;
    let res = await dbQuery(query, [uniqueDistributors]).catch(error => {
        throw(error);
    });

    let distributorsMap = JSON.parse(JSON.stringify(res)).reduce(
        function(ret, el){
            ret[el['name']] = el['id'];
            return ret;
        }, {});

    let distributorsID = idxToInsert.map((idxProduct) => distributorsMap[products[idxProduct]['distributor']]);

    // 
    let categories = idxToInsert.map((idxProduct) => categoryTranslation[products[idxProduct]['categories']]);
    let uniqueCategories = [ ...new Set(categories)];

    query = `SELECT id, name, distributorID
            FROM categories
            WHERE name IN (?);`;
    res = await dbQuery(query, [uniqueCategories]).catch(error => {
        throw(error);
    });

    // categoriesMap is formated like {name1: {distributorID1: id, ...}, ...}
    let categoriesMap = JSON.parse(JSON.stringify(res)).reduce(
        function(ret, el){
            if(!(el['name'] in ret)){
                ret[el['name']] = {};
            }
            ret[el['name']][el['distributorID']] = el['id'];
            return ret;
        }, {});

    let categoriesID = idxToInsert.map((idxProduct, counter) => {
        let product = products[idxProduct];
        let byDistributorMap = categoriesMap[categoryTranslation[product['categories']]];
        if(!byDistributorMap)
            return null;
        return byDistributorMap[distributorsID[counter]];
    });

    let propsToInsert = idxToInsert.map((idxProduct, index) => {
        let product = products[idxProduct];
        return [product['name'], product['brand'], product['url'], categoriesID[index], distributorsID[index], reviewsID[index]];
    });

    console.log(distributorsID);

    console.log(propsToInsert);

    query = `INSERT INTO products (name, brand, url, categoryID, distributorID, reviewsID) VALUES ?;`;
    res = await dbQuery(query, [propsToInsert]).catch(error => {
        throw(error);
    });
}


// Insert Product Rows
async function updateInsertProducts(products){

    const urls = products.map(product => product['url']);
    let query = `SELECT url, reviewsID
                FROM products
                WHERE url IN (?);
                `;
    let [urlsInDB, reviewsID] = await dbQuery(query, [urls]).catch(error => {
        throw(error);
    });

    if(urlsInDB == undefined) urlsInDB = [];
    if(reviewsID == undefined) reviewsID = [];

    [idxProductsInDB, idxProductsNotInDB] = getAllIndexes(urls, urlsInDB);

    const reviewsProps = products.map(product => [product['rating'], product['num-reviews']]);
    const isReviewNull = reviewsProps.map(reviewProp => reviewProp.every(el => el === null));

    await insertReviews(reviewsProps, idxProductsNotInDB, isReviewNull);
    const insertedReviewIDs = await getInsertedReviewID(idxProductsNotInDB, isReviewNull);
    await updateReviews(reviewsProps, reviewsID, idxProductsInDB, isReviewNull);

    await insertProducts(products, insertedReviewIDs, idxProductsNotInDB)



}

module.exports = {
    getAllProductUrls,
    getProductUrlsByDistributor,
    updateInsertProducts
}