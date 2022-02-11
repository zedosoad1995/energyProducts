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

async function getProductAttrNames(){
    const query = `
        SELECT DISTINCT attributeName, datatype
        FROM productAttributes;`;

    return dbQuery(query)
            .then(attrs => attrs.reduce((obj, val) => {
                obj[val['attributeName']] = val['datatype'];
                return obj;
            }, {}))
            .catch(error => {
                throw(error);
            });
}

async function getAllAtributeNames(){
    const allProdAttributes = await getProductAttrNames();

    return Object.keys(metaProds).concat(Object.keys(allProdAttributes));
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

        if(Object.keys(allProdAttributes).includes(attr)){
            requestedAttr[attr] = {
                fieldName: attr,
                table: 'productAttributes',
                tableAlias: `pa${prodAttrNum}`,
                prodAttrJoin: true,
                dataType: allProdAttributes[attr]
            };

            prodAttrNum++;
        }
    })

    return requestedAttr;
}

function getSelectQuery(attributesObj){
    let selectQuery = Object.entries(attributesObj).reduce((selectStr, [fieldNameAlias, attrObj]) => {
        if(!('table' in attrObj && 'fieldName' in attrObj && 'dataType' in attrObj)) return selectQuery;

        if(attrObj['dataType'] === 'Number'){
            selectStr += `CAST(${attrObj['tableAlias']}.\`${attrObj['fieldName']}\` AS DECIMAL(11, 4)) AS \`${fieldNameAlias}\`, `;
        }else{
            selectStr += `${attrObj['tableAlias']}.\`${attrObj['fieldName']}\` AS \`${fieldNameAlias}\`, `;
        }

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

function getWhereQuery(filters){
    let whereQuery = filters.reduce((whereStr, filter) => {

        const [command, attr, ...vals] = filter;

        // TODO: deal with this case
        //if(!(attr in product)) return true;

        switch(command) {
            case 'between':
                const [minVal, maxVal] = vals;
                whereStr += `\`${attr}\` >= ${minVal} AND \`${attr}\` <= ${maxVal} AND `;

                break;
            case 'includes':
                whereStr += `\`${attr}\` IN ('${vals[0].join(`', '`)}') AND `;
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

function getOrderQuery(attributesToSort, order){
    let orderQuery = attributesToSort.reduce((orderStr, attr, i) => {

        orderStr += `\`${attr}\` ${order[i]}, `;

        return orderStr;
    }, '');

    if(orderQuery.length >= 2){
        orderQuery = orderQuery.substring(0, orderQuery.length - 2);
    }else{
        orderQuery = '1';
    }

    return orderQuery;
}

class ProductsQuery {

    static #mainQuery;
    static #attributesObj;
    static #mainQueryNoFilter;

    constructor(){
        // Silence is key
    }

    static async initializeMainQuery(request){
        const {attributesToDisplay, attributesToSort, order, filters} = request;

        await errorHandling_getProductsToDisplay(attributesToDisplay, attributesToSort, order, filters);

        [this.#mainQuery, this.#mainQueryNoFilter] = await this.#getQuery(attributesToDisplay, filters, attributesToSort, order);
    }

    static async getProducts(limit = 10, offset = 0){
        limit = clip(limit, 0, process.env.MAX_ITEMS_PER_PAGE);
        offset = (offset < 0) ? 0 : offset;

        const query = this.#mainQuery + `
            LIMIT ${limit}
            OFFSET ${offset}`;

        return await dbQuery(query)
            .catch(error => {
                throw(error);
            });
    }

    static getHeader(){
        return Object.keys(this.#attributesObj);
    }

    static async getNumRows(){
        const query = 'SELECT COUNT(*) AS cnt FROM (' + this.#mainQuery + ') _';

        return await dbQuery(query)
            .then(cnt => cnt[0]['cnt'])
            .catch(error => {
                throw(error);
            });
    }

    static async #getMinMax(attr){
        // TODO: pensar como lidar (deverei enviar erro?)
        if(!(attr in this.#attributesObj && this.#attributesObj[attr]['dataType'] === 'Number')) return;

        const query = `
            SELECT MIN(prods.\`${attr}\`) as min, MAX(prods.\`${attr}\`) as max
            FROM (${this.#mainQuery}) prods`;

        return await dbQuery(query)
            .then(row => {
                return {min: row[0]['min'], max: row[0]['max']};
            })
            .catch(error => {
                throw(error);
            });
    }

    // TODO, make cnt of each val, and have a limit
    static async #getAllStringsInAttribute(attr){
        // TODO: pensar como lidar (deverei enviar erro?)
        if(!(attr in this.#attributesObj && ['String', 'Boolean'].includes(this.#attributesObj[attr]['dataType']))) return;

        const query = `
            SELECT t_allValues.val, 
                CASE
                    WHEN t_filtered.val IS NULL THEN 0
                    ELSE t_filtered.cnt 
                END AS cnt
            FROM
                (
                    SELECT DISTINCT prodsNoFilter.\`${attr}\` AS val
                    FROM (${this.#mainQueryNoFilter}) prodsNoFilter
                ) t_allValues
            LEFT JOIN
                (
                    SELECT prodsFiltered.\`${attr}\` AS val, COUNT(prodsFiltered.\`${attr}\`) AS cnt
                    FROM (${this.#mainQuery}) prodsFiltered
                    GROUP BY prodsFiltered.\`${attr}\`
                ) t_filtered
            ON t_filtered.val = t_allValues.val
            ORDER BY cnt DESC`;

        return await dbQuery(query)
            .then(rows => {
                return {
                    values: rows.map(row => {
                        return [row['val'], row['cnt']];
                    })
                };
            })
            .catch(error => {
                throw(error);
            });
    }

    static async #getSingleAttributeRange(attr){
        if(!(attr in this.#attributesObj && 'dataType' in this.#attributesObj[attr])) return;

        switch(this.#attributesObj[attr]['dataType']) {
            case 'String':
            case 'Boolean':
                return this.#getAllStringsInAttribute(attr);
            case 'Number':
                return this.#getMinMax(attr);
            default:
                throw new Error(`Invalid dataType. Must be one of the types: 'Boolean', 'String', 'Number'`);
        }
    }

    static async getAttributeRanges(){
        const header = this.getHeader();

        return await header.reduce(async (rangesObj, attr) => {
            await this.#getSingleAttributeRange(attr)
            .then(async (ranges) => {

                await rangesObj
                .then(obj => {
                    obj[attr] = ranges;
                });
            });

            return rangesObj;
        }, Promise.resolve({}))
    }

    static async getAttributeTypes(){
        return Object.entries(this.#attributesObj).reduce((obj, [key, attrObj]) => {
                obj[key] = attrObj['dataType'];
                return obj;
            }, {});
    }

    static async #getQuery(attributesToDisplay, filters, attributesToSort, order){
        this.#attributesObj = await mergeRequestedAttributes(attributesToDisplay);
        const selects = getSelectQuery(this.#attributesObj);
        const joins = getJoinQuery(this.#attributesObj);
        const wheres = getWhereQuery(filters);
        const orderBys = getOrderQuery(attributesToSort, order);

        const queryNoFilter = `
            SELECT prods.*
            FROM 
                (SELECT ${selects}
                FROM products
                ${joins}) prods`;
    
        return [
            `${queryNoFilter}
            WHERE ${wheres}
            ORDER BY ${orderBys}`, 
            queryNoFilter];
    }
}

module.exports = {
    getAllAtributeNames,
    ProductsQuery
}