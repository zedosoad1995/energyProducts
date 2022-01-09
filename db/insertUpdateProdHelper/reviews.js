const db = require('../config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

async function getReviewsToInsert_ProdInDB(productsInDB, urlsInDBWithNewReview){
    if(Object.keys(productsInDB).length === 0){
        return {
            reviewsToInsert_ProdInDB: [],
            idProdToUpdate: []
        };
    }

    // Check products without a review that just got the first review
    const query = `SELECT id, url 
                FROM products 
                WHERE url IN (?) AND reviewsID IS NULL;`;

    return await dbQuery(query, [urlsInDBWithNewReview])
        .then(res => {
            return res.reduce((obj, row) => {
                    obj['idProdToUpdate'].push(row['id']);
                    obj['reviewsToInsert_ProdInDB'].push([productsInDB[row['url']]['rating'], productsInDB[row['url']]['num-reviews']]);
                    return obj;
                }, {'idProdToUpdate': [], 'reviewsToInsert_ProdInDB': []});
        })
        .catch(error => {
            throw(error);
        });
}

function getReviewsToInsert_ProdNotInDB(productsNotInDB){
    return Object.values(productsNotInDB).reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined){
                    obj['reviewsToInsert_ProdNotInDB'].push([product['rating'], product['num-reviews']]);
                    obj['hasReview'].push(true);
                }else{
                    obj['hasReview'].push(false);
                }
                return obj;
            }, {'reviewsToInsert_ProdNotInDB': [], 'hasReview': []});
}

async function insertReviews(productsInDB, productsNotInDB, urlsInDBWithNewReview){

    const {reviewsToInsert_ProdInDB, idProdToUpdate} = 
        await getReviewsToInsert_ProdInDB(productsInDB, urlsInDBWithNewReview);

    const {reviewsToInsert_ProdNotInDB, hasReview} = 
        getReviewsToInsert_ProdNotInDB(productsNotInDB);

    const reviewsToInsert = [...reviewsToInsert_ProdInDB, ...reviewsToInsert_ProdNotInDB];

    if(reviewsToInsert.length > 0){
        // Insert
        let query = `INSERT INTO reviews (rating, numReviews) VALUES ?;`;
        await dbQuery(query, [reviewsToInsert])
        .catch(error => {
            throw(error);
        });
    }

    return {
        idProdToUpdate,
        hasReview
    };
}

function getIdReviewToInsert(idReviewToInsert, hasReview){
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

async function getInsertedIds_Reviews(lenIdsToUpdate, hasReview){
    // Get Id of Inserted Values
    const query = `
        SELECT id
        FROM reviews
        WHERE id >= LAST_INSERT_ID();`;

    const ids = await dbQuery(query)
    .then(res => res.map(row => row['id']))
    .catch(error => {
        throw(error);
    });

    const idReviewToUpdate = ids.slice(0, lenIdsToUpdate);
    const idReviewToInsert = getIdReviewToInsert(ids.slice(lenIdsToUpdate), hasReview);

    return {
        idReviewToUpdate: idReviewToUpdate, 
        idReviewToInsert: idReviewToInsert, 
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
            rating = 
                    CASE 
                        WHEN VALUES(rating) IS NULL
                            THEN rating 
                        ELSE VALUES(rating) 
                    END, 
            numReviews = 
                        CASE 
                            WHEN VALUES(numReviews) IS NULL
                                THEN numReviews 
                            ELSE VALUES(numReviews) 
                        END;`;

    await dbQuery(query, [reviewsToUpdate])
    .catch(error => {
        throw(error);
    });
}

module.exports = {
    insertReviews,
    updateReviews,
    getInsertedIds_Reviews,
    getReviewsToInsert_ProdInDB,
    getReviewsToInsert_ProdNotInDB,
    getIdReviewToInsert,
}