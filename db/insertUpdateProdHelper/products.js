const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

const categoryTranslation = {
    'Esquentadores': 'Esquentador', 
    'Termoacumuladores': 'Termoacumulador'
};

async function getDistributorIds(productsNotInDB){
    const distributorNames = Object.values(productsNotInDB).map((product) => product['distributor']);

    if(distributorNames.includes(undefined))
        throw new Error(`undefined value in key 'distributor'`);

    const query = `SELECT id, name
                    FROM distributors
                    WHERE name IN (?);`;

    return await dbQuery(query, [distributorNames])
        .then(rows => {
            return Object.values(productsNotInDB).map(prod => {
                    return rows.filter(row => row['name'] === prod['distributor'])[0]['id'];
                });
        })
        .catch(error => {
            throw(error);
        });
}

async function getCategoryIds(productsNotInDB, distributorIds){
    // TODO: categoryTranslation? How to better deal with that
    const categoryNamesInDB = Object.values(productsNotInDB).map((product) => categoryTranslation[product['categories']]);

    if(categoryNamesInDB.includes(undefined))
        throw new Error(`undefined value in key 'categories'`);

    const query = `SELECT id, name, distributorID
                    FROM categories
                    WHERE name IN (?);`;

    return await dbQuery(query, [categoryNamesInDB])
        .then(res => {
            return res.reduce((obj, category) => {

                    const key = category['name'] + category['distributorID'];
                    obj[key] = category['id'];
                    return obj;
                }, {});
        })
        .then(categoryNameToId => {
            return categoryNamesInDB.map((categoryName, i) => {

                    const key = categoryName + distributorIds[i];
                    return (key in categoryNameToId) ? categoryNameToId[key] : null;
                });
        })
        .catch(error => {
            throw(error);
        });
}

async function getProductsToInsert(productsNotInDB, idReviewsToInsert){
    if(Object.keys(productsNotInDB).length === 0) return;

    if(Object.keys(productsNotInDB).length !== idReviewsToInsert.length){
        throw new Error(`'productsNotInDB' and 'idReviewsToInsert' have different length`);
    }

    const distributorIds = await getDistributorIds(productsNotInDB);
    const categoryIds = await getCategoryIds(productsNotInDB, distributorIds);
    
    return Object.values(productsNotInDB).map((product, index) => {
            return [null, product['name'], product['brand'], product['url'], categoryIds[index], distributorIds[index], idReviewsToInsert[index]];
        });
}

function getProductsToUpdate(idProdToUpdate, idReviewToUpdate){
    if(idProdToUpdate.length === 0 || idReviewToUpdate.length === 0) return;

    if(idProdToUpdate.some(isNaN) || idReviewToUpdate.some(isNaN) || idProdToUpdate.includes(null) || idReviewToUpdate.includes(null))
        throw new Error(`Input array contains invalid elements. All must be Numbers.`);
    
    if(idProdToUpdate.length !== idReviewToUpdate.length)
        throw new Error(`'idProdToUpdate' and 'idReviewToUpdate' have different lengths.`);

    return idProdToUpdate.map((idProd, i) => [idProd, null, null, null, null, null, idReviewToUpdate[i]])
}

/*async function insertProducts(productsToInsert){
    query = `INSERT INTO products (name, brand, url, categoryID, distributorID, reviewsID) VALUES ?;`;
    res = await dbQuery(query, [productsToInsert])
    .catch(error => {
        throw(error);
    });
}

async function updateProducts(idProdToUpdate, idReviewToUpdate){
    if(idProdToUpdate.length == 0) return;

    let productPropsToUpdate = [];
    for(let i = 0; i < idProdToUpdate.length; i++){
        productPropsToUpdate.push([idProdToUpdate[i], idReviewToUpdate[i]]);
    }
    
    const query = `INSERT INTO products 
            (id, reviewsID)
            VALUES ? ON DUPLICATE KEY UPDATE
            reviewsID = VALUES(reviewsID);`;
    
    await dbQuery(query, [productPropsToUpdate])
    .catch(error => {
        throw(error);
    });
}*/

async function updateInsertProducts(products){
    if(products.length == 0) return;

    const query = `
        INSERT INTO products 
        (id, name, brand, url, categoryID, distributorID, reviewsID)
        VALUES ? 
        ON DUPLICATE KEY UPDATE
        reviewsID = VALUES(reviewsID);`;
    
    await dbQuery(query, [products])
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    getDistributorIds,
    getCategoryIds,
    updateInsertProducts,
    getProductsToInsert,
    getProductsToUpdate
}