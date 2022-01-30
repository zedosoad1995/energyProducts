const db = require('../db/config');
const util = require('util');
const _ = require('lodash');
const {clip} = require('./utils/math');
require('dotenv').config();

const metaProds = require('./data/prodsForDisplayMeta.json');

const dbQuery = util.promisify(db.query).bind(db);

async function hasInvalidAttributeNames(attributesToDisplay, invalidAttributeNames){
    const allAttributeNames = await getProductAttrNames();

    attributesToDisplay.forEach(attr => {
        if(!allAttributeNames.includes(attr)){
            invalidAttributeNames.push(attr);
        }
    })

    return invalidAttributeNames.length > 0;
}

// TODO: Colocar error noutras funcoes?
async function errorHandling_getProductsToDisplay(attributesToDisplay, attributesToSort, order, filters){
    if(!attributesToDisplay)
        throw new Error(`'attributesToDisplay' does not exist`);

    if(attributesToDisplay.length === 0)
        throw new Error(`'attributesToSort' has length zero`);

    if(order && attributesToSort.length !== order.length)
        throw new Error(`'attributesToSort' and 'order' must have the same length.`);

    if(order && order.some(val => !['ASC', 'DESC'].includes(val)))
        throw new Error(`'order' can only contain the values: 'ASC', 'DESC'.`);

    if(attributesToSort && attributesToSort.some(val => !attributesToDisplay.includes(val)))
        throw new Error(`All values in 'attributesToSort' must be exist in 'attributesToDisplay'`);
    
    if(filters && filters.some(filter => !attributesToDisplay.includes(filter[1])))
        throw new Error(`All values in 'filters' must be exist in 'attributesToDisplay'`);

    /*let invalidAttributeNames = [];
    if(await hasInvalidAttributeNames(attributesToDisplay, invalidAttributeNames))
        throw new Error(`'attributesToDisplay' contains attributes that to not exist in the DB: ${invalidAttributeNames.join(', ')}`);*/
}

async function getDatatype(attributes){
    const query = `
        SELECT DISTINCT attributeName, datatype
        FROM productAttributes
        WHERE attributeName IN ('${attributes.join(`', '`)}');`;

    return dbQuery(query)
            .then(rows => rows.reduce((obj, row) => {
                obj[row['attributeName']] = row['datatype'];
                return obj;
            }, {}))
            .catch(error => {
                throw(error);
            });
}

async function getProductAttrNames(){
    const query = `
        SELECT DISTINCT attributeName
        FROM productAttributes;`;

    return dbQuery(query)
            .then(row => row.map(val => val['attributeName']))
            .catch(error => {
                throw(error);
            });
}

async function mergeRequestedAttributes(attrToDisplay){
    const allProdAttributes = await getProductAttrNames();

    const requestedAttr = {};

    let prodAttrNum = 1;

    attrToDisplay.forEach(attr => {
        if(Object.keys(metaProds).includes(attr)){
            requestedAttr[attr] = metaProds[attr];

            return;
        }

        if(allProdAttributes.includes(attr)){
            requestedAttr[attr] = {
                fieldName: attr,
                table: 'productAttributes',
                tableAlias: `pa${prodAttrNum}`,
                prodAttrJoin: true
            };

            prodAttrNum++;
        }
    })

    return requestedAttr;
}

function getSelectQuery(attributesObj){
    let selectQuery = Object.entries(attributesObj).reduce((selectStr, [fieldNameAlias, attrObj]) => {
        if(!('table' in attrObj && 'fieldName' in attrObj)) return selectQuery;

        selectStr += `${attrObj['tableAlias']}.\`${attrObj['fieldName']}\` AS \`${fieldNameAlias}\`, `;
        return selectStr;
    }, '');

    if(selectQuery.length >= 2){
        selectQuery = selectQuery.substring(0, selectQuery.length - 2);
    }else{
        selectQuery = '';
    }

    return selectQuery;
}

function getJoinQuery(attributesObj){
    const joinTables = []

    return Object.entries(attributesObj).reduce((joinStr, [fieldNameAlias, attrObj]) => {
        if(!('fieldName' in attrObj) || attrObj['noJoin']) return joinStr;

        if('prodAttrJoin' in attrObj){
            if(!('tableAlias' in attrObj)) return joinStr;

            joinStr += 
                `LEFT JOIN (
                    SELECT productID, value AS \`${fieldNameAlias}\`
                    FROM productAttributes
                    WHERE attributeName = '${attrObj['fieldName']}'
                ) ${attrObj['tableAlias']}
                    ON \`${attrObj['tableAlias']}\`.productID = products.id
                `;
        }else{
            if(!('table' in attrObj) || !('thisJoinField' in attrObj || 'productJoinField' in attrObj) ||
                joinTables.includes(attrObj['table'])){
                    return joinStr;
                }

            joinStr += 
                `LEFT JOIN ${attrObj['table']}
                    ON ${attrObj['table']}.${('thisJoinField' in attrObj) ? attrObj['thisJoinField'] : 'id'
                } = products.${('productJoinField' in attrObj) ? attrObj['productJoinField'] : 'id'}
                `;

            joinTables.push(attrObj['table']);
        }

        return joinStr;
    }, '');
}

function getWhereQuery(attributesObj, filters){
    let whereQuery = filters.reduce((whereStr, filter) => {

        const [command, attr, ...vals] = filter;

        // TODO: deal with this case
        //if(!(attr in product)) return true;

        const attrObj = attributesObj[attr];

        switch(command) {
            case 'between':
                const [minVal, maxVal] = vals;
                whereStr += `${attrObj['tableAlias']}.\`${attrObj['fieldName']}\` >= ${minVal} AND ${
                    attrObj['tableAlias']}.\`${attrObj['fieldName']}\` <= ${maxVal} AND `;
                break;
            case 'includes':
                break
            default:
                throw new Error(`Invalid command given: '${command}'.\n The valid commands are: 'between', 'includes'`);
        }

        return whereStr;
    }, '');

    if(whereQuery.length >= 5){
        whereQuery = whereQuery.substring(0, whereQuery.length - 5);
    }else{
        whereQuery = 'TRUE';
    }

    return whereQuery;
}

function getOrderQuery(attributesObj, attributesToSort, order){
    let orderQuery = attributesToSort.reduce((orderStr, attr, i) => {

        const attrObj = attributesObj[attr];

        orderStr += `${attrObj['tableAlias']}.\`${attrObj['fieldName']}\` ${order[i]}, `;

        return orderStr;
    }, '');

    if(orderQuery.length >= 2){
        orderQuery = orderQuery.substring(0, orderQuery.length - 2);
    }else{
        orderQuery = '1';
    }

    return orderQuery;
}

async function getQuery(attributesToDisplay, filters, attributesToSort, order, limit, offset){
    const attributesObj = await mergeRequestedAttributes(attributesToDisplay);
    const selects = getSelectQuery(attributesObj);
    const joins = getJoinQuery(attributesObj);
    const wheres = getWhereQuery(attributesObj, filters);
    const orderBys = getOrderQuery(attributesObj, attributesToSort, order);

    return `
        SELECT ${selects}
        FROM products
        ${joins}
        WHERE ${wheres}
        ORDER BY ${orderBys}
        LIMIT ${limit}
        OFFSET ${offset}`;
}

function sortProducts(products, attributesToSort, order){
    if(!attributesToSort || !order || order.length === 0) return products;

    const sortNameToVal = {
        ASC: 1,
        DESC: -1
    };

    return products.sort((prod1, prod2) => {
        for(let i = 0; i < order.length; i++){
            const attribute = attributesToSort[i];

            if(prod1[attribute] > prod2[attribute]) return sortNameToVal[order[i]];
            if(prod1[attribute] < prod2[attribute]) return -sortNameToVal[order[i]];
        }
    });
}

// TODO: Middleware???
function correctProdAttr(product){
    if('Altura' in product){
        // It probably is in mm -> convert to cm
        if(product['Altura'] > 200){
            product['Altura'] /= 10;
        }
    }
    return product;
}

// between: [command:between, attr, val:min, val:max]
// greater: [command:greater(equal), attr, val:min]
// less: [command:less(equal), attr, val:max]
// includes: [command:includes, attr, string[]]
// not includes: [command:notincludes, attr, string[]]
// TODO: error quando o atributo nao existe
function canFilterProduct(product, filters){
    if(!filters) return true;

    return filters.every(filter => {
            const [command, attr, ...vals] = filter;

            // TODO: deal with this case
            if(!(attr in product)) return true;

            switch(command) {
                case 'between':
                    return product[attr] >= vals[0] && product[attr] <= vals[1];
                case 'greater':
                    return product[attr] >= vals[0];
                case 'less':
                    return product[attr] <= vals[0];
                case 'includes':
                    return vals[0].includes(product[attr]);
                case 'not includes':
                    return !vals[0].includes(product[attr]);
                default:
                    throw new Error(`Invalid command given: '${command}'.\n The valid commands are: 'between', 'greater', 'less', 'includes', and 'not includes'`);
            }
        });
}

// request = {attributesToDisplay: string[], attributesToSort: string[], order: string[], filters: [string[], ...]}
async function getProductsForDisplay(request, limit = 10, offset = 0){
    limit = clip(limit, 0, process.env.MAX_ITEMS_PER_PAGE);
    offset = (offset < 0) ? 0 : offset;

    const {attributesToDisplay, attributesToSort, order, filters} = request;

    await errorHandling_getProductsToDisplay(attributesToDisplay, attributesToSort, order, filters);

    const query = await getQuery(attributesToDisplay, filters, attributesToSort, order, limit, offset);

    // TODO: fazer conversao do tipo aqui?
    return await dbQuery(query)
    .then(async (prods) => {
        // TODO: attributeTypes para colunas que não pertençam a table productAttributes
        // https://dba.stackexchange.com/questions/30141/mysql-metadata-function-to-get-projected-column-type-in-query may have the answer
        return {
            maxSize: prods.length,
            data: prods,
            attributeTypes: await getDatatype(attributesToDisplay)
        }
    })
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    getProductsForDisplay,
    getProductAttrNames
}