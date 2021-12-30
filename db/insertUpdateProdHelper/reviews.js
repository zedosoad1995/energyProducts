const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

async function getReviewsToInsert_ProdInDB(productsInDB){
    if(Object.keys(productsInDB).length == 0){
        return {
            reviewsToInsert_ProdInDB: [],
            idProdToUpdate: [], 
            urlsInDBWithNewReview: []
        };
    }

    const urlsInDBWithNewReview = Object.values(productsInDB).reduce(
        function(obj, product){
            if(product['rating'] != undefined || product['num-reviews'] != undefined)
                obj.push(product['url']);
            return obj;
        }, []);

    // Check products without a review that just got one
    let query = `SELECT id, url 
                FROM products 
                WHERE url IN (?) AND reviewsID IS NULL;`;
    const {idProdToUpdate, urlInDBToInsert} = await dbQuery(query, [urlsInDBWithNewReview])
    .then(res => {
        return res.reduce(
            function(obj, row){
                obj['idProdToUpdate'].push(row['id']);
                obj['urlInDBToInsert'].push(row['url']);
                return obj;
            }, {'idProdToUpdate': [], 'urlInDBToInsert': []}
        );
    })
    .catch(error => {
        throw(error);
    });

    return {
        reviewsToInsert_ProdInDB: urlInDBToInsert.map(url => [productsInDB[url]['rating'], productsInDB[url]['num-reviews']]),
        idProdToUpdate: idProdToUpdate, 
        urlsInDBWithNewReview: urlsInDBWithNewReview
    };

}

function getReviewsToInsert_ProdNotInDB(productsNotInDB){
    return Object.values(productsNotInDB).reduce(
            function(obj, product){
                if(product['rating'] != undefined || product['num-reviews'] != undefined){
                    obj['reviewsToInsert_ProdNotInDB'].push([product['rating'], product['num-reviews']]);
                    obj['hasReview'].push(true);
                }else{
                    obj['hasReview'].push(false);
                }
                return obj;
            }, 
            {'reviewsToInsert_ProdNotInDB': [], 'hasReview': []});
}

function getIdReviewToInsert(ids, len, hasReview){
    const idReviewToInsert = ids.slice(len);

    let idReviewToInsertWithNull = [];
    let j = 0;
    for(let i = 0; i < hasReview.length; i++){
        if(hasReview[i]){
            idReviewToInsertWithNull.push(idReviewToInsert[j]);
            j++;
        }else{
            idReviewToInsertWithNull.push(null);
        }
    }

    return idReviewToInsertWithNull;
}

async function insertReviews(productsInDB, productsNotInDB){

    const {reviewsToInsert_ProdInDB, idProdToUpdate, urlsInDBWithNewReview} = 
        await getReviewsToInsert_ProdInDB(productsInDB);

    const {reviewsToInsert_ProdNotInDB, hasReview} = 
        getReviewsToInsert_ProdNotInDB(productsNotInDB);

    const reviewsToInsert = [...reviewsToInsert_ProdInDB, ...reviewsToInsert_ProdNotInDB];

    if(reviewsToInsert.length == 0) 
        return {
            idProdToUpdate: [], 
            idReviewToUpdate: [], 
            idReviewToInsert: [], 
            urlsInDBWithNewReview: urlsInDBWithNewReview
        };
    
    // Insert
    let query = `INSERT INTO reviews (rating, numReviews) VALUES ?;`;
    await dbQuery(query, [reviewsToInsert])
    .catch(error => {
        throw(error);
    });

    // Get Id of Inserted Values
    query = `SELECT id
            FROM reviews
            WHERE id >= LAST_INSERT_ID();`;
    const ids = await dbQuery(query)
    .then(res => res.map(row => row['id']))
    .catch(error => {
        throw(error);
    });

    const idReviewToUpdate = ids.slice(0, reviewsToInsert_ProdInDB.length);
    const idReviewToInsert = getIdReviewToInsert(ids, reviewsToInsert_ProdInDB.length, hasReview);

    return {
        idProdToUpdate: idProdToUpdate, 
        idReviewToUpdate: idReviewToUpdate, 
        idReviewToInsert: idReviewToInsert, 
        urlsInDBWithNewReview: urlsInDBWithNewReview
    };
}

async function updateReviews(productsInDB, urlsToUpdate){
    if(Object.keys(productsInDB).length === 0 || urlsToUpdate.length === 0) return;

    let query = `SELECT url, reviewsID
                FROM products 
                WHERE url IN (?) AND reviewsID IS NOT NULL`;

    const reviewsToUpdate = await dbQuery(query, [urlsToUpdate])
    .then(res => res.map(row => {
        const product = productsInDB[row['url']];
        return [row['reviewsID'], product['rating'], product['num-reviews']];
    }))
    .catch(error => {
        throw(error);
    });

    if(reviewsToUpdate.length === 0) return;

    // Update
    query = `INSERT INTO reviews 
            (id, rating, numReviews)
            VALUES ? ON DUPLICATE KEY UPDATE
            rating = VALUES(rating), 
            numReviews = VALUES(numReviews);`;

    await dbQuery(query, [reviewsToUpdate])
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    insertReviews,
    updateReviews
}