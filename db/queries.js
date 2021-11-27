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

function insertReviews(reviewsProps, idxToInsert){
    let propsToInsert = idxToInsert.map(i => reviewsProps[i]);
    
    query = `
            INSERT INTO reviews (rating, numReviews)
            VALUES ?;
            `;
    const res = await dbQuery(query, [propsToInsert]).catch(error => {
        throw(error);
    });
}

function updateReviews(reviewsProps, reviewsID, idxToUpdate){
    let propsToUpdate = idxToUpdate.map((i, counter) => [reviewsID[counter], ...reviewsProps[i]]);
    
    query = `
            INSERT INTO reviews 
            (id, rating, numReviews)
            VALUES 
            `;
    propsToUpdate.forEach(props => {
        query += "(" + props.join(", ") + "), ";
    });
    query = query.substring(0, str.length() - 2);
    query += ` ON DUPLICATE KEY UPDATE 
            rating = VALUES(rating), 
            numReviews = VALUES(numReviews);`

    const res = await dbQuery(query).catch(error => {
        throw(error);
    });
}

// Insert Product Rows
async function updateInsertProducts(products){

    const urls = products.map(product => product['url']);
    let query = `
                SELECT url, reviewsID
                FROM products
                WHERE url IN (?);
                `;
    let [urlsInDB, reviewsID] = await dbQuery(query, [urls]).catch(error => {
        throw(error);
    });

    [idxProductsInDB, idxProductsNotInDB] = getAllIndexes(urls, urlsInDB);

    const reviewsProps = products.map(product => [product['rating'], product['num-reviews']]);

    insertReviews(reviewsProps, idxProductsNotInDB);
    updateReviews(reviewsProps, reviewsID, idxProductsInDB);

    
}

module.exports = {
    getAllProductUrls,
    getProductUrlsByDistributor,
    insertProductRows
}