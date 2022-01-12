const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

function dateToString(date){
    return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
}

async function getChangedPrices(productsInDB, urlToProductId, prodIdToUrl_InDB, today){
    if(Object.keys(productsInDB).length == 0) return {pricesChangedNotSameDay: [], pricesChangedSameDay: []};

    const todayStr = dateToString(today);

    const {prodIdANDPrice, prodId} = Object.values(productsInDB).reduce((obj, product) => {
            if(product['price'] && urlToProductId[product['url']]){
                obj['prodIdANDPrice'].push(urlToProductId[product['url']].toString() + product['price'].toString());
                obj['prodId'].push(urlToProductId[product['url']]);
            }
            return obj;
        }, 
        {prodIdANDPrice: [], prodId: []});

    const query = `
                SELECT m.*
                FROM products p
                INNER JOIN (
                    SELECT *, CONCAT(productID, TRIM(price)+0) AS prodId_Price
                    FROM prices
                ) m
                ON m.productID = p.id
                INNER JOIN (
                    SELECT MAX(date) AS date, productID
                    FROM prices
                    GROUP BY productID
                ) m_newest
                ON m_newest.date = m.date AND m_newest.productID = m.productID
                WHERE m.prodId_Price NOT IN (?)
                    AND m.productID IN (?);`;
    
    return await dbQuery(query, [prodIdANDPrice, prodId])
        .then(prices => {
            return prices.reduce((obj, price) => {
                    const url = prodIdToUrl_InDB[price['productID']];

                    if(dateToString(price['date']) == todayStr)
                        obj['pricesChangedSameDay'].push([price['id'], productsInDB[url]['price'], today, null]);
                    else                
                        obj['pricesChangedNotSameDay'].push([null, productsInDB[url]['price'], today, price['productID']]);

                    return obj;

                }, {pricesChangedNotSameDay: [], pricesChangedSameDay: []});
        })
        .catch(error => {
            throw(error);
        });
}

async function getFirstPrices_ProdInDB(productsInDB, prodIdToUrl_InDB, today){

    const query = `SELECT DISTINCT productID FROM prices;`;

    return await dbQuery(query)
        .then(prices => {
            return prices.map(price => price['productID']);
        })
        .then(productIdsInPricesDB => {
            let idsToInsert = Object.keys(prodIdToUrl_InDB);

            for(let i = 0; i < productIdsInPricesDB.length; i++){
                const index = idsToInsert.indexOf(productIdsInPricesDB[i].toString());
                if (index > -1)
                    idsToInsert.splice(index, 1);
            }

            return idsToInsert.map(id => {
                const url = prodIdToUrl_InDB[id];
                return [null, productsInDB[url]['price'], today, Number(id)];
            });        
        })
        .catch(error => {
            throw(error);
        });
}

async function getPricesToUpsert(productsInDB, productsNotInDB, urlToProductId){
    const today = new Date();

    const pricesToInsert_ProdNotInDB = Object.values(productsNotInDB).map(product => [null, product['price'], today, urlToProductId[product['url']]]);

    const prodIdToUrl_InDB = Object.keys(productsInDB).reduce((prodIdToUrl, url) =>{
            prodIdToUrl[urlToProductId[url]] = url;
            return prodIdToUrl;
        }, {}
    );

    const {pricesChangedNotSameDay, pricesChangedSameDay} = await getChangedPrices(productsInDB, urlToProductId, prodIdToUrl_InDB, today);
    const newPricesToInsert_ProdInDB = await getFirstPrices_ProdInDB(productsInDB, prodIdToUrl_InDB, today);

    return [...pricesChangedNotSameDay, ...newPricesToInsert_ProdInDB, ...pricesToInsert_ProdNotInDB, ...pricesChangedSameDay];
}

async function upsertPrices(pricesToUpsert){
    if(pricesToUpsert.length == 0) return;

    const query = `INSERT INTO prices 
            (id, price, date, productID)
            VALUES ? ON DUPLICATE KEY UPDATE
            price = VALUES(price);`;
    
    await dbQuery(query, [pricesToUpsert])
    .catch(error => {
        throw(error);
    });
}

async function fillPrices(productsInDB, productsNotInDB, urlToProductId){
    await getPricesToUpsert(productsInDB, productsNotInDB, urlToProductId);
    await upsertPrices(pricesToUpsert);
}

module.exports = {
    fillPrices,
    getChangedPrices,
    getFirstPrices_ProdInDB,
    getPricesToUpsert,
    upsertPrices
}