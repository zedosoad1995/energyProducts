const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

// TODO. What if value is undefined? How to choose: String or Number?
// Ideia, no final agrupar todos os atributos e ver a moda. Se algum tiver um valor diferent, inseri-lo.
// Ou entao... sera que o campo do tipo importa?
function getAttributeType(str){
    if(isNaN(str))
        return 'String';
    else
        return 'Number';
}

async function fillProductAttributes(productsNotInDB, urlToProductId, productsInDBWithNewAttr){
    let prodAttributesToInsert = [];

    [...Object.values(productsNotInDB), ...Object.values(productsInDBWithNewAttr)]
    .forEach(product => {
        if(!('more-details' in product)) return;

        const productId = urlToProductId[product['url']];
        const prodAttributes = product['more-details'];

        // TODO: Log quando houver key ou value undefined
        Object.entries(prodAttributes).forEach(([attributeKey, attributeValue]) => {
            if(attributeKey && attributeValue){
                prodAttributesToInsert.push([attributeKey, attributeValue, getAttributeType(attributeValue), productId]);
            }            
        });
    });

    if(prodAttributesToInsert.length == 0) return;

    query = `INSERT INTO productAttributes (attributeName, value, datatype, productID) VALUES ?;`;
    await dbQuery(query, [prodAttributesToInsert])
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    fillProductAttributes
}