const db = require('./config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

async function truncateCategories(){
    const queryTruncate = `DELETE FROM categories;`;
    const queryReset = `ALTER TABLE categories AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

async function truncateDistributors(){
    const queryTruncate = `DELETE FROM distributors;`;
    const queryReset = `ALTER TABLE distributors AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

async function truncatePrices(){
    const queryTruncate = `TRUNCATE TABLE prices;`;
    const queryReset = `ALTER TABLE prices AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

async function truncateProductAttributes(){
    const queryTruncate = `TRUNCATE TABLE productAttributes;`;
    const queryReset = `ALTER TABLE productAttributes AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

async function truncateProducts(){
    const queryTruncate = `DELETE FROM products;`;
    const queryReset = `ALTER TABLE products AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

async function truncateReviews(){
    const queryTruncate = `DELETE FROM reviews;`;
    const queryReset = `ALTER TABLE reviews AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

async function insertCategories(data){
    const query = `INSERT INTO categories (name, url, distributorID) VALUES ?;`;

    await dbQuery(query, [data])
    .catch(error => {
        throw(error);
    })
}

async function insertDistributors(data){
    const query = `INSERT INTO distributors (name, url) VALUES ?;`;

    await dbQuery(query, [data])
    .catch(error => {
        throw(error);
    })
}

async function insertProducts(data){
    const query = `INSERT INTO products (name, brand, url, categoryID, reviewsID, distributorID) VALUES ?;`;

    await dbQuery(query, [data])
    .catch(error => {
        throw(error);
    })
}

async function insertProductAttributes(data){
    const query = `INSERT INTO productAttributes (attributeName, value, datatype, productID) VALUES ?;`;

    await dbQuery(query, [data])
    .catch(error => {
        throw(error);
    })
}

async function fillCategories(data){

    await truncateCategories()
    .then(insertCategories(data))
    .catch(error => {
        throw(error);
    })
}

async function fillDistributors(data){

    await truncateDistributors()
    .then(insertDistributors(data))
    .catch(error => {
        throw(error);
    })
}

async function fillProducts(data){

    await truncateProducts()
    .then(insertProducts(data))
    .catch(error => {
        throw(error);
    })
}

async function fillProductAttributes(data){

    await truncateProductAttributes()
    .then(insertProductAttributes(data))
    .catch(error => {
        throw(error);
    })
}

async function truncateAll(){
    await truncateCategories()
    .then(truncateDistributors())
    .then(truncatePrices())
    .then(truncateProducts())
    .then(truncateProductAttributes())
    .then(truncateReviews())
    .catch(error => {
        throw(error);
    })
}

module.exports = {
    truncateAll,
    fillCategories,
    fillDistributors,
    fillProducts,
    fillProductAttributes
}