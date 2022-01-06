const db = require('./config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

function DbModel(tableName, columnNames, isReferenced){
    this.tableName = tableName;
    this.columnNames = columnNames;
    this.isReferenced = isReferenced;
}

DbModel.prototype.truncate = async function(){
    const queryTruncate = (this.isReferenced ? `DELETE FROM ` : `TRUNCATE TABLE `) + `${this.tableName};`;
    const queryReset = `ALTER TABLE ${this.tableName} AUTO_INCREMENT = 1;`;

    await dbQuery(queryTruncate)
    .then(dbQuery(queryReset))
    .catch(error => {
        throw(error);
    })
}

DbModel.prototype.insert = async function(data){

    if(data.length === 0) return;

    const colsToInsert = (data[0].length === this.columnNames.length) ? this.columnNames : this.columnNames.slice(1);

    const query = `INSERT INTO ${this.tableName} (${colsToInsert.join()}) VALUES ?;`;

    await dbQuery(query, [data])
    .catch(error => {
        throw(error);
    })
}

DbModel.prototype.fill = async function(data){
    await this.truncate()
    .then(this.insert(data))
    .catch(error => {
        throw(error);
    })
}

const categories = new DbModel('categories', ['id', 'name', 'url', 'distributorID'], true);
const distributors = new DbModel('distributors', ['id', 'name', 'url'], true);
const products = new DbModel('products', ['id', 'name', 'brand', 'url', 'categoryID', 'reviewsID', 'distributorID'], true);
const productAttributes = new DbModel('productAttributes', ['id', 'attributeName', 'value', 'datatype', 'productID'], false);
const prices = new DbModel('prices', ['id', 'price', 'date', 'productID'], false);
const reviews = new DbModel('reviews', ['id', 'rating', 'numReviews'], true);

async function truncateAll(){
    await categories.truncate()
    .then(distributors.truncate())
    .then(prices.truncate())
    .then(products.truncate())
    .then(productAttributes.truncate())
    .then(reviews.truncate())
    .catch(error => {
        throw(error);
    })
}


module.exports = {
    truncateAll,
    categories,
    distributors,
    prices,
    products,
    productAttributes,
    reviews
}