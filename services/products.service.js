const db = require('../db/config');
const util = require('util');
const _ = require('lodash');
const { val } = require('cheerio/lib/api/attributes');

const dbQuery = util.promisify(db.query).bind(db);

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

    return `CAST(pa${idx}.\`${attribute}\` AS ${datatypeStr}) AS \`${attribute}\`, `;
}

function getJoinTemplateStr(attribute, idx){
    return `
        LEFT JOIN (
            SELECT productID, value AS \`${attribute}\`
            FROM productAttributes
            WHERE attributeName = '${attribute}'
        ) pa${idx}
            ON pa${idx}.productID = p.id`;
}

async function hasInvalidAttributeNames(attributesToDisplay, invalidAttributeNames){
    const query = `
        SELECT DISTINCT attributeName
        FROM productAttributes;`;

    const allAttributeNames =  await dbQuery(query)
                                .then(row => row.map(val => val['attributeName']))
                                .catch(error => {
                                    throw(error);
                                });

    attributesToDisplay.forEach(attr => {
        if(!allAttributeNames.includes(attr)){
            invalidAttributeNames.push(attr);
        }
    })

    return invalidAttributeNames.length > 0;
}

// TODO: Colocar error noutras funcoes?
async function errorHandling_getProductsToDisplay(attributesToDisplay, attributesToSort, order){
    if(attributesToDisplay.length === 0)
        throw new Error(`'attributesToSort' has length zero`);

    if(attributesToSort.length !== order.length)
        throw new Error(`'attributesToSort' and 'order' must have the same length.`);

    if(order.some(val => !['ASC', 'DESC'].includes(val)))
        throw new Error(`'order' can only contain the values: 'ASC', 'DESC'.`);

    if(attributesToSort.some(val => !attributesToDisplay.includes(val)))
        throw new Error(`All values in 'attributesToSort' must be exist in 'attributesToDisplay'`);

    let invalidAttributeNames = [];
    if(await hasInvalidAttributeNames(attributesToDisplay, invalidAttributeNames))
        throw new Error(`'attributesToDisplay' contains attributes that to not exist in the DB: ${invalidAttributeNames.join(', ')}`);
}

async function getQuery(attributesToDisplay){
    let {joinStr, selectStr} = await attributesToDisplay.reduce(async (obj, attribute, i) => {   
        await obj.then(async (res) => {
            res['joinStr'] += getJoinTemplateStr(attribute, i);
            res['selectStr'] += await getSelectTemplateStr(attribute, i);
        })

        return obj;
    }, Promise.resolve({joinStr: '', selectStr: ''}));

    selectStr = selectStr.substring(0, selectStr.length - 2);

    return `
        SELECT p.id, ${selectStr}
        FROM products p ${joinStr}`;
}

function sortProducts(products, attributesToSort, order){
    if(order.length === 0) return products;

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
function canFilterProduct(product, filters){
    return filters.every(filter => {
            const [command, attr, ...vals] = filter;

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

// request = {attributesToDisplay: string[], attributesToSort: string[], order: string[]}
async function getProductsForDisplay(request){
    const {attributesToDisplay, attributesToSort, order, filters} = request;

    errorHandling_getProductsToDisplay(attributesToDisplay, attributesToSort, order);

    const query = await getQuery(attributesToDisplay)

    // TODO: fazer conversao do tipo aqui?
    return dbQuery(query)
    .then(prods => prods.map((product) => correctProdAttr(product)))
    .then(prods => prods.filter(product => canFilterProduct(product, filters)))
    .then(prods => sortProducts(prods, attributesToSort, order))
    .catch(error => {
        throw(error);
    });
}

getProductsForDisplay({
    attributesToDisplay: ['EAN', 'Marca', 'Peso', 'Altura'], 
    attributesToSort: ['Peso'], 
    order: ['DESC'],
    filters: [['between', 'Peso', 24, 25], ['greater', 'Altura', 100], ['not includes', 'Marca', ['VULCANO']]]
})
.then(console.log);

module.exports = {
    getProductsForDisplay
}