const db = require('../db/config');
const util = require('util');
const _ = require('lodash');

const dbQuery = util.promisify(db.query).bind(db);

async function structureRequestData(request){
    const {attributesToDisplay = [], attributesToSort = [], order = []} = request;

    if(attributesToDisplay.length === 0)
        throw new Error(`'attributesToSort' undefined or empty`)

    if(attributesToSort.length !== order.length)
        throw new Error(`'attributesToSort' and 'order' must have the same length.`)

    if(!attributesToSort.every(val => attributesToDisplay.includes(val)))
        throw new Error(`All values in 'attributesToSort' must be exist in 'attributesToDisplay'`)

    const query = `
        SELECT DISTINCT attributeName
        FROM productAttributes;`;

    const allAttributeNames =  await dbQuery(query)
                                .then(row => row.map(val => val['attributeName']))
                                .catch(error => {
                                    throw(error);
                                });

    let invalidAttributeNames = [];
    attributesToDisplay.forEach(attr => {
        if(!allAttributeNames.includes(attr)){
            invalidAttributeNames.push(attr);
        }
    })

    if(invalidAttributeNames.length > 0)
        throw new Error(`'attributesToDisplay' contains attributes that to not exist in the DB: ${invalidAttributeNames.join(', ')}`);

    let orderByStr = '1';
    if(order.length > 0){
        orderByStr = _.zipWith(attributesToSort, order).reduce((str, [attribute, order]) => {
            str += `pa${attributesToDisplay.findIndex(val => val === attribute)}.\`${attribute}\` ${order}, `;
            return str;
        }, '');

        orderByStr = orderByStr.substring(0, orderByStr.length - 2);
    }

    let {innerJoinStr, selectStr} = attributesToDisplay.reduce((obj, attribute, i) => {
        obj['innerJoinStr'] += `
            LEFT JOIN (
                SELECT productID, value AS \`${attribute}\`
                FROM productAttributes
                WHERE attributeName = '${attribute}'
            ) pa${i}
                ON pa${i}.productID = p.id`;

        obj['selectStr'] += `pa${i}.\`${attribute}\`, `
        return obj;
    }, {innerJoinStr: '', selectStr: ''});

    selectStr = selectStr.substring(0, selectStr.length - 2);

    return {
        selectStr,
        innerJoinStr,
        orderByStr
    };
}

async function getProductsToDisplay(request){

    const {selectStr, innerJoinStr, orderByStr} = await structureRequestData(request)

    const query = `
        SELECT p.id, ${selectStr}
        FROM products p ${innerJoinStr}
        ORDER BY ${orderByStr};`;

    return dbQuery(query, [selectStr, innerJoinStr, orderByStr])
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    getProductsToDisplay
}