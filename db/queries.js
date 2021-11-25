const db = require('./config');
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
async function insertReviewsRow(rating, numReviews){
    const query =   `
                    INSERT INTO reviews (rating, numReviews)
                    VALUES (?, ?)
                    `;

    const res = await dbQuery(query, [rating, numReviews]).catch(error => {
        throw(error);
    })
}

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

// Insert Product Rows
async function insertProductRows(products){
    // Get list of existing products
    const urls = products.map(product => {
        return product['url'];
    })
    let query = `
                SELECT url
                FROM products
                WHERE url IN (?);
                `;
    let existingUrls = await dbQuery(query, [urls]).catch(error => {
        throw(error);
    });
    newProducts = products.filter(product => {
        return !existingUrls.includes(product['url']);
    });
    existingProducts = products.filter(product => {
        return existingUrls.includes(product['url']);
    });

    console.log(products);

    const ratingsProps = products.map(product => {
        return [product['rating'], product['num-reviews']];
    });

    console.log(ratingsProps);

    query = `
            INSERT INTO reviews (rating, numReviews)
            VALUES ?;
            `;
    const res = await dbQuery(query, [ratingsProps]).catch(error => {
        throw(error);
    });

    
}

module.exports = {
    getAllProductUrls,
    getProductUrlsByDistributor,
    insertProductRows
}