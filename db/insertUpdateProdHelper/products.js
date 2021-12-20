const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

const categoryTranslation = {
    'Esquentadores': 'Esquentador', 
    'Termoacumuladores': 'Termoacumulador'
};

async function getDistributorIds(productsNotInDB){
    const distributorNames = Object.values(productsNotInDB).map((product) => product['distributor']);
    const uniqueDistributorNames = [ ...new Set(distributorNames)];

    const query = `SELECT id, name
                    FROM distributors
                    WHERE name IN (?);`;

    const distNameToId = await dbQuery(query, [uniqueDistributorNames])
    .then(res => {
        return res.reduce(
            function(ret, el){
                ret[el['name']] = el['id'];
                return ret;
            }, {});
    })
    .catch(error => {
        throw(error);
    });

    return distributorNames.map((distributorName) => distNameToId[distributorName]);
}

async function getCategoryIds(productsNotInDB, distributorIds){
    // TODO: categoryTranslation? How to better deal with that
    const categoryNames = Object.values(productsNotInDB).map((product) => categoryTranslation[product['categories']]);
    const uniqueCategoryNames = [ ...new Set(categoryNames)];

    const query = `SELECT id, name, distributorID
                    FROM categories
                    WHERE name IN (?);`;

    return await dbQuery(query, [uniqueCategoryNames])
        .then(res => {
            return res.reduce(
                function(obj, category){
                    const key = category['name'] + category['distributorID'];
                    obj[key] = category['id'];
                    return obj;
                }, {});
        })
        .then(categoryNameToId => {
            let categoryIds = [];

            for(let i = 0; i < categoryNames.length; i++){
                const key = categoryNames[i] + distributorIds[i];

                if(key in categoryNameToId)
                    categoryIds.push(categoryNameToId[key]);
                else
                    categoryIds.push(null);
            }
            
            return categoryIds;
        })
        .catch(error => {
            throw(error);
        });

}

async function insertProducts(productsNotInDB, idReviewsToInsert){

    if(Object.keys(productsNotInDB).length === 0) return;

    const distributorIds = await getDistributorIds(productsNotInDB);
    const categoryIds = await getCategoryIds(productsNotInDB, distributorIds);
    console.log('a');
    
    const productsToInsert = Object.values(productsNotInDB).map((product, index) => {
        return [product['name'], product['brand'], product['url'], categoryIds[index], distributorIds[index], idReviewsToInsert[index]];
    });

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
}

module.exports = {
    insertProducts,
    updateProducts
}