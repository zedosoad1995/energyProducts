const db = require('../db/config');
const util = require('util');
const _ = require('lodash');
const {clip} = require('./utils/math');
require('dotenv').config();

const dbQuery = util.promisify(db.query).bind(db);

async function hasInvalidAttributeNames(attributesToDisplay, invalidAttributeNames){
    const allAttributeNames = await getProductAttributeNames();

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

async function getDatatype(attribute){
    const query = `
        SELECT datatype
        FROM productAttributes
        WHERE attributeName = '${attribute}'
        LIMIT 1;`;

    return dbQuery(query)
            .then(row => row[0]['datatype'])
            .catch(error => {
                throw(error);
            });
}

async function getSelectTemplateStr(attribute, idx){
    const datatype = await getDatatype(attribute);

    const datatypeStr = (datatype === 'Number') ? 'DECIMAL(11, 4)' : 'CHAR'

    return `CAST(pa${idx}.\`${attribute}\` AS ${datatypeStr}) AS \`${attribute}\``;
}

function getJoinTemplateStr(attribute, idx){
    return `
        LEFT JOIN (
            SELECT productID, value AS \`${attribute}\`
            FROM productAttributes
            WHERE attributeName = '${attribute}'
        ) pa${idx}
            ON pa${idx}.productID = products.id`;
}

async function getProductAttributeNames(){
    const query = `
        SELECT DISTINCT attributeName
        FROM productAttributes;`;

    return dbQuery(query)
            .then(row => row.map(val => val['attributeName']))
            .catch(error => {
                throw(error);
            });
}

async function getProdAttrQueryParts(attributesToDisplay){
    const validAttr = await getProductAttributeNames();

    let {prodAttrJoins, prodAttrSelects} = await attributesToDisplay.reduce(async (obj, attribute, i) => {   
        await obj.then(async (res) => {

            if(validAttr.includes(attribute)){
                res['prodAttrJoins'].push(getJoinTemplateStr(attribute, i));
                res['prodAttrSelects'].push(await getSelectTemplateStr(attribute, i));
            }
        })

        return obj;
    }, Promise.resolve({prodAttrJoins: [], prodAttrSelects: []}));

    return {prodAttrJoins, prodAttrSelects};
}

const getQueryParts = ({validAttributes, fieldNames, tableName, joinFieldProduct = 'id', joinFieldNewTable = 'id'}) => attributesToDisplay => {
    
    const {selects, joins} = validAttributes.reduce((obj, attribute, i) => {
        if(attributesToDisplay.includes(attribute)){
            obj['selects'].push(`${tableName}.${fieldNames[i]} AS ${attribute}`);

            obj['joins'] = [
                `
                LEFT JOIN ${tableName}
                    ON ${tableName}.${joinFieldNewTable} = products.${joinFieldProduct}
                `];
        }

        return obj;
    }, {selects: [], joins: []});

    return [selects, joins];
};

const getDistributorQueryParts = getQueryParts({
                                        validAttributes: ['distributor'], 
                                        fieldNames: ['name'],
                                        tableName: 'distributors', 
                                        joinFieldProduct: 'distributorID'});

const getCategoryQueryParts = getQueryParts({
                                        validAttributes: ['category'], 
                                        fieldNames: ['name'],
                                        tableName: 'categories', 
                                        joinFieldProduct: 'categoryID'});

const getReviewQueryParts = getQueryParts({
                                        validAttributes: ['rating', 'numReviews'], 
                                        fieldNames: ['rating', 'numReviews'],
                                        tableName: 'reviews', 
                                        joinFieldProduct: 'reviewsID'});

const getPriceQueryParts = getQueryParts({
                                        validAttributes: ['price'], 
                                        fieldNames: ['price'],
                                        tableName: 'prices', 
                                        joinFieldNewTable: 'productID'});

const getProductsQueryParts = getQueryParts({
                                        validAttributes: ['url', 'marca'], 
                                        fieldNames: ['url', 'marca'],
                                        tableName: 'products'});

async function getQuery(attributesToDisplay){
    const [distributorsSelects, distributorsJoins] = getDistributorQueryParts(attributesToDisplay);
    const [categoriesSelects, categoriesJoins] = getCategoryQueryParts(attributesToDisplay);
    const [reviewsSelects, reviewsJoins] = getReviewQueryParts(attributesToDisplay);
    const [pricesSelects, pricesJoins] = getPriceQueryParts(attributesToDisplay);
    const [productsSelects,] = getProductsQueryParts(attributesToDisplay);
    const {prodAttrJoins, prodAttrSelects} = await getProdAttrQueryParts(attributesToDisplay);

    const selects = [...distributorsSelects, ...categoriesSelects, ...reviewsSelects, ...pricesSelects, ...productsSelects, ...prodAttrSelects].join(', ');
    const joins = [...distributorsJoins, ...categoriesJoins, ...reviewsJoins, ...pricesJoins, ...prodAttrJoins].join('');

    return `
        SELECT products.name AS name ${(selects)? ',' : ''} ${selects}
        FROM products ${joins}`;
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

    const query = await getQuery(attributesToDisplay)

    // TODO: fazer conversao do tipo aqui?
    return await dbQuery(query)
    .then(prods => prods.map((product) => correctProdAttr(product)))
    .then(prods => prods.filter(product => canFilterProduct(product, filters)))
    .then(prods => sortProducts(prods, attributesToSort, order))
    .then(prods => {
        return {
            maxSize: prods.length,
            data: prods.slice(offset, offset + limit)
        }
    })
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    getProductsForDisplay
}