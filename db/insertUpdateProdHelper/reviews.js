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
                    obj['reviewsToInsert_ProdInDB'].push([null, productsInDB[row['url']]['rating'], productsInDB[row['url']]['num-reviews']]);
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
                    obj['reviewsToInsert_ProdNotInDB'].push([null, product['rating'], product['num-reviews']]);
                    obj['hasReview'].push(true);
                }else{
                    obj['hasReview'].push(false);
                }
                return obj;
            }, {'reviewsToInsert_ProdNotInDB': [], 'hasReview': []});
}

function getIdReviewToInsert(idReviewToInsert, hasReview){
    let idReviewToInsertWithNull = [];
    let j = 0;

    for(let i = 0; i < hasReview.length; i++){
        if(hasReview[i]){
            if(j >= idReviewToInsert.length)
                throw new Error('Not enough ids in \'idReviewToInsert\', for number of \'true\' in \'hasReview\'');
            idReviewToInsertWithNull.push(idReviewToInsert[j]);
            j++;
        }else{
            idReviewToInsertWithNull.push(null);
        }
    }

    if(j < idReviewToInsert.filter(x => x === true).length)
        throw new Error('Too many ids in \'idReviewToInsertData\', for number of \'true\' in \'hasReview\'');

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
    const idReviewToInsert = await getIdReviewToInsert(ids.slice(lenIdsToUpdate, lenIdsToUpdate + hasReview.length), hasReview);

    return {
        idReviewToUpdate, 
        idReviewToInsert
    };
}

async function getReviewsToUpdate(productsInDB, urlsToUpdate){
    if(Object.keys(productsInDB).length === 0 || urlsToUpdate.length === 0) return [];



    const query = `
        SELECT url, reviewsID
        FROM products 
        WHERE url IN (?) AND reviewsID IS NOT NULL`;

    return await dbQuery(query, [urlsToUpdate])
        .then(res => res.map(row => {
            const product = productsInDB[row['url']];
            if(product['rating'] === undefined && product['num-reviews'] === undefined)
                throw new Error(`Both keys 'rating' and 'num-reviews' from 'productsInDB' are undefined in at least 1 product`);
            return [row['reviewsID'], product['rating'], product['num-reviews']];
        }))
        .catch(error => {
            throw(error);
        });
}

async function updateInsertReviews(reviews){
    if(reviews.length === 0) return;

    const idReviewsToUpsert = reviews.reduce((arr, review) => {
        if(review[0] != null)
            arr.push(review[0]);
        return arr;
    }, []);

    let query = `
        SELECT id
        FROM reviews
        WHERE id in (?)`;

    let existingIdsInDB = [];

    if(idReviewsToUpsert.length > 0){
        existingIdsInDB = await dbQuery(query, [idReviewsToUpsert])
        .catch(error => {
            throw(error);
        });
    }

    if(existingIdsInDB.length !== idReviewsToUpsert.length)
        throw new Error(`'id' from 'reviews' does not exist in DB, or duplicate 'id'`);

    // Update
    query = `
        INSERT INTO reviews 
        (id, rating, numReviews)
        VALUES ? 
        ON DUPLICATE KEY UPDATE 
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

    await dbQuery(query, [reviews])
    .catch(error => {
        throw(error);
    });
}

async function fillReviews(productsInDB, productsNotInDB){
    const urlsInDBWithNewReview = Object.values(productsInDB)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);

    const {reviewsToInsert_ProdInDB, idProdToUpdate} = await getReviewsToInsert_ProdInDB(productsInDB, urlsInDBWithNewReview);
    const {reviewsToInsert_ProdNotInDB, hasReview} = getReviewsToInsert_ProdNotInDB(productsNotInDB);
    const reviewsToInsert = [...reviewsToInsert_ProdInDB, ...reviewsToInsert_ProdNotInDB];

    // TODO: Nao inserir se os valores ja tiverem na DB
    const reviewsToUpdate = await getReviewsToUpdate(productsInDB, urlsInDBWithNewReview);

    const reviewsToUpsert = [...reviewsToInsert, ...reviewsToUpdate];

    await updateInsertReviews(reviewsToUpsert);

    const {idReviewToUpdate, idReviewToInsert} = await getInsertedIds_Reviews(idProdToUpdate.length, hasReview);

    return {
        idProdToUpdate,
        idReviewToUpdate,
        idReviewToInsert
    }
}

module.exports = {
    updateInsertReviews,
    getInsertedIds_Reviews,
    getReviewsToInsert_ProdInDB,
    getReviewsToInsert_ProdNotInDB,
    getIdReviewToInsert,
    getReviewsToUpdate,
    fillReviews
}