const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

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

module.exports = {
    insertProductAttributes
}