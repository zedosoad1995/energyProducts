const {categories, distributors, prices, products, productAttributes, reviews} = require('../../db/dbModels');
const {insertReviews, updateReviews, getReviewsToInsert_ProdInDB, getReviewsToInsert_ProdNotInDB,
    getInsertedIds_Reviews, getIdReviewToInsert} = require('../../db/insertUpdateProdHelper/reviews.js');

describe('Function getReviewsToInsert_ProdInDB', () => {

    it('Returns the scraped reviews where the prod already existed in DB, but did not contain any review; also return the correspondent productId', async () => {
        const productsScrapedData = {
            url1: {url: 'url1', 'num-reviews': 10, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': 10, rating: undefined}, 
            url3: {url: 'url3', 'num-reviews': undefined, rating: 4.3}, 
            url4: {url: 'url4', 'num-reviews': undefined, rating: undefined}, 
            url5: {url: 'urlWithReviewAlreadyInDB', 'num-reviews': 10, rating: 4.3},
            url7: {url: 'urlNotInDB', 'num-reviews': 10, rating: 4.3}
        };

        const expectedVals = {
            idProdToUpdate: [1, 2, 3],
            reviewsToInsert_ProdInDB: [[4.3, 10], [undefined, 10], [4.3, undefined]]
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 4.0, 12]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, null, 1], [2, 'prod2', 'brand2', 'url2', null, null, 1],
                        [3, 'prod3', 'brand2', 'url3', null, null, 1], [4, 'prod4', 'brand1', 'url4', null, null, 1],
                        [5, 'prod5', 'brand1', 'urlWithReviewAlreadyInDB', null, 1, 1]];

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        const urlsInDBWithNewReview = Object.values(productsScrapedData)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);

        expect(getReviewsToInsert_ProdInDB(productsScrapedData, urlsInDBWithNewReview)).resolves.toStrictEqual(expectedVals);
    });

    it('Returns an empty dictionary, when there is no scraped products in DB', async () => {
        const productsScrapedData = {};

        const expectedVals = {
                idProdToUpdate: [],
                reviewsToInsert_ProdInDB: []
            };

        const urlsInDBWithNewReview = Object.values(productsScrapedData)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);

        expect(getReviewsToInsert_ProdInDB(productsScrapedData, urlsInDBWithNewReview)).resolves.toStrictEqual(expectedVals);
    });
});

describe('Function getReviewsToInsert_ProdNotInDB', () => {

    it('Returns the scraped reviews where the prod does not exist in DB; also returns a boolean list with valid and invalid reviews', () => {
        const productsScrapedData = {
            url1: {url: 'url1', 'num-reviews': 10, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': undefined, rating: undefined}, 
        };

        const expectedVals = {
            reviewsToInsert_ProdNotInDB: [[4.3, 10]],
            hasReview: [true, false]
        };
        
        expect(getReviewsToInsert_ProdNotInDB(productsScrapedData)).toStrictEqual(expectedVals);
    })
});

describe('insertReviews', () => {

    /*
        prods in DB with review
        2 with scraped different review (one with 1 undefined value)
        1 with scraped same review
        1 with undefined scraped review
        1 with no scraped review

        prods in DB with no review
        1 with undefined scraped review
        1 with no scraped review
        2 with scraped review (one with 1 undefined value)

        prods not in DB
        2 with scraped review (one with 1 undefined value)
        1 with undefined scraped review
    */
    it('Inserts new reviews in DB', async () => {
        const productsInDBData = {
            url1: {url: 'url1', 'num-reviews': 14, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': 104, rating: undefined}, 
            url3: {url: 'url3', 'num-reviews': 33, rating: 3.3}, 
            url4: {url: 'url4', 'num-reviews': undefined, rating: undefined}, 
            url6: {url: 'url6', 'num-reviews': undefined, rating: undefined},
            url8: {url: 'url8', 'num-reviews': 10, rating: 4.3},
            url9: {url: 'url9', 'num-reviews': undefined, rating: 4.3},
        };

        const productsNotInDBData = {
            url10: {url: 'url10', 'num-reviews': undefined, rating: 4.3},
            url11: {url: 'url11', 'num-reviews': 169, rating: 4.3},
            url12: {url: 'url12', 'num-reviews': undefined, rating: undefined},
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 4.0, 12], [2, 1.0, 103], [3, 3.3, 33], [4, 4.4, 666], [5, 5, 55]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, 1, 1], [2, 'prod2', 'brand2', 'url2', null, 2, 1],
                        [3, 'prod3', 'brand2', 'url3', null, 3, 1], [4, 'prod4', 'brand1', 'url4', null, 4, 1],
                        [5, 'prod5', 'brand1', 'url5', null, 5, 1], [6, 'prod6', 'brand1', 'url6', null, null, 1],
                        [7, 'prod7', 'brand1', 'url7', null, null, 1], [8, 'prod8', 'brand1', 'url8', null, null, 1],
                        [9, 'prod9', 'brand1', 'url9', null, null, 1]];

        const expectedReviewsData = [[1, 4.0, 12], [2, 1.0, 103], [3, 3.3, 33], [4, 4.4, 666], [5, 5, 55], [6, 4.3, 10], [7, 4.3, null], [8, 4.3, null], [9, 4.3, 169]];
        const expectedValsIdProdToUpdate = [8, 9];
        const expectedHasReviews = [true, true, false];

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        const urlsInDBWithNewReview = Object.values(productsInDBData)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);

        await insertReviews(productsInDBData, productsNotInDBData, urlsInDBWithNewReview)
        .then(async ({idProdToUpdate, hasReview}) => {
            expect(idProdToUpdate).toStrictEqual(expectedValsIdProdToUpdate);
            expect(hasReview).toStrictEqual(expectedHasReviews);

            const reviewsTable = await reviews.get();
            expect(reviewsTable).toStrictEqual(expectedReviewsData);
        })
    });
});

describe('updateReviews', () => {

    /*
        prods in DB with review
        2 with scraped different review (one with 1 undefined value)
        1 with scraped same review
        1 with undefined scraped review
        1 with no scraped review

        prods in DB with no review
        1 with undefined scraped review
        1 with no scraped review
        2 with scraped review (one with 1 undefined value)
    */
    it('updates reviews in DB', async () => {
        const productsInDBData = {
            url1: {url: 'url1', 'num-reviews': 14, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': 104, rating: null}, 
            url3: {url: 'url3', 'num-reviews': 33, rating: 3.3}, 
            url4: {url: 'url4', 'num-reviews': undefined, rating: undefined}, 
            url6: {url: 'url6', 'num-reviews': undefined, rating: undefined},
            url8: {url: 'url8', 'num-reviews': 10, rating: 4.3},
            url9: {url: 'url9', 'num-reviews': undefined, rating: 4.3},
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 4.3, 12], [2, 1.0, 103], [3, 3.3, 33], [4, 4.4, 666], [5, 5, 55]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, 1, 1], [2, 'prod2', 'brand2', 'url2', null, 2, 1],
                        [3, 'prod3', 'brand2', 'url3', null, 3, 1], [4, 'prod4', 'brand1', 'url4', null, 4, 1],
                        [5, 'prod5', 'brand1', 'url5', null, 5, 1], [6, 'prod6', 'brand1', 'url6', null, null, 1],
                        [7, 'prod7', 'brand1', 'url7', null, null, 1], [8, 'prod8', 'brand1', 'url8', null, null, 1],
                        [9, 'prod9', 'brand1', 'url9', null, null, 1]];

        const expectedReviewsData = [[1, 4.3, 14], [2, 1.0, 104], [3, 3.3, 33], [4, 4.4, 666], [5, 5, 55]];

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        const urlsInDBWithNewReview = Object.values(productsInDBData)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);

        await updateReviews(productsInDBData, urlsInDBWithNewReview)
        .then(async () => {
            const reviewsTable = await reviews.get();
            expect(reviewsTable).toStrictEqual(expectedReviewsData);
        })
    });
});

describe('Function getInsertedIds_Reviews', () => {

    it('replaces indexes of idReviewToInsert, where hasReview is false, with null', () => {
        const idReviewToInsertData = [1, 2, 4, 5];
        const hasReviewData = [true, true, false, true, false];

        const expectedOutput = [1, 2, null, 4, null]

        const output = getIdReviewToInsert(idReviewToInsertData, hasReviewData)
        
        expect(output).toStrictEqual(expectedOutput);
    })

    /*
        prods in DB with review
        2 with scraped different review (one with 1 undefined value)
        1 with scraped same review
        1 with undefined scraped review
        1 with no scraped review

        prods in DB with no review
        1 with undefined scraped review
        1 with no scraped review
        2 with scraped review (one with 1 undefined value)

        prods not in DB
        2 with scraped review (one with 1 undefined value)
        1 with undefined scraped review
    */
    it('Inserts new reviews in DB', async () => {
        const productsInDBData = {
            url1: {url: 'url1', 'num-reviews': 14, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': 104, rating: undefined}, 
            url3: {url: 'url3', 'num-reviews': 33, rating: 3.3}, 
            url4: {url: 'url4', 'num-reviews': undefined, rating: undefined}, 
            url6: {url: 'url6', 'num-reviews': undefined, rating: undefined},
            url8: {url: 'url8', 'num-reviews': 10, rating: 4.3},
            url9: {url: 'url9', 'num-reviews': undefined, rating: 4.3},
        };

        const productsNotInDBData = {
            url10: {url: 'url10', 'num-reviews': undefined, rating: 4.3},
            url11: {url: 'url11', 'num-reviews': 169, rating: 4.3},
            url12: {url: 'url12', 'num-reviews': undefined, rating: undefined},
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 4.0, 12], [2, 1.0, 103], [3, 3.3, 33], [4, 4.4, 666], [5, 5, 55]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, 1, 1], [2, 'prod2', 'brand2', 'url2', null, 2, 1],
                        [3, 'prod3', 'brand2', 'url3', null, 3, 1], [4, 'prod4', 'brand1', 'url4', null, 4, 1],
                        [5, 'prod5', 'brand1', 'url5', null, 5, 1], [6, 'prod6', 'brand1', 'url6', null, null, 1],
                        [7, 'prod7', 'brand1', 'url7', null, null, 1], [8, 'prod8', 'brand1', 'url8', null, null, 1],
                        [9, 'prod9', 'brand1', 'url9', null, null, 1]];

        const expectedIdReviewToUpdate = [6, 7];
        const expectedIdReviewToInsert = [8, 9, null];

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        const urlsInDBWithNewReview = Object.values(productsInDBData)
            .reduce((obj, product) => {
                if(product['rating'] != undefined || product['num-reviews'] != undefined)
                    obj.push(product['url']);
                return obj;
            }, []);

        const {idProdToUpdate, hasReview} = await insertReviews(productsInDBData, productsNotInDBData, urlsInDBWithNewReview);
        await updateReviews(productsInDBData, urlsInDBWithNewReview);
 
        getInsertedIds_Reviews(idProdToUpdate.length, hasReview)
        .then(({idReviewToUpdate, idReviewToInsert}) => {
            expect(idReviewToUpdate).toStrictEqual(expectedIdReviewToUpdate);
            expect(idReviewToInsert).toStrictEqual(expectedIdReviewToInsert);
        });
    });
});