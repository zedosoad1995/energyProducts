const {distributors, products, reviews} = require('../../db/dbModels');
const {updateInsertReviews, getReviewsToInsert_ProdInDB, getReviewsToInsert_ProdNotInDB,
    getInsertedIds_Reviews, getIdReviewToInsert, getReviewsToUpdate, fillReviews} = require('../../db/insertUpdateProdHelper/reviews.js');

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
            reviewsToInsert_ProdInDB: [[null, 4.3, 10], [null, undefined, 10], [null, 4.3, undefined]]
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

        await expect(getReviewsToInsert_ProdInDB(productsScrapedData, urlsInDBWithNewReview)).resolves.toStrictEqual(expectedVals);
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

        await expect(getReviewsToInsert_ProdInDB(productsScrapedData, urlsInDBWithNewReview)).resolves.toStrictEqual(expectedVals);
    });
});

describe('Function getReviewsToInsert_ProdNotInDB', () => {

    it('Returns the scraped reviews where the prod does not exist in DB; also returns a boolean list with valid and invalid reviews', () => {
        const productsScrapedData = {
            url1: {url: 'url1', 'num-reviews': 10, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': undefined, rating: undefined}, 
        };

        const expectedVals = {
            reviewsToInsert_ProdNotInDB: [[null, 4.3, 10]],
            hasReview: [true, false]
        };
        
        expect(getReviewsToInsert_ProdNotInDB(productsScrapedData)).toStrictEqual(expectedVals);
    })
});

describe('getReviewsToUpdate', () => {

    it('updates reviews in DB', async () => {

        const urlsInDBWithNewReview = ['url1', 'url2', 'url3', 'url5'];
        const productsInDBData = {
            url1: {url: 'url1', 'num-reviews': 14, rating: 4.3}, 
            url2: {url: 'url2', 'num-reviews': 104, rating: null}, 
            url3: {url: 'url3', 'num-reviews': 33, rating: 3.3},
            url5: {url: 'url5', 'num-reviews': 11, rating: 1.1}, 
            url6: {url: 'url6', 'num-reviews': 11, rating: 1.1}, 
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 4.3, 12], [2, 1.0, 103], [3, 3.3, 33]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, 1, 1], [2, 'prod2', 'brand2', 'url2', null, 2, 1],
                        [3, 'prod3', 'brand2', 'url3', null, null, 1], [4, 'prod4', 'brand1', 'url4', null, 3, 1]];

        const expectedReviewsToUpdate = [[1, 4.3, 14], [2, null, 104]];

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        getReviewsToUpdate(productsInDBData, urlsInDBWithNewReview)
        .then(reviewsToUpdate => {
            expect(reviewsToUpdate).toStrictEqual(expectedReviewsToUpdate);
        });
    });

    it(`Throw error, when both 'rating' and 'num-reviews' keys of 'productsInDB' are undefined`, async () => {

        const urlsInDBWithNewReview = ['url1'];
        const productsInDBData = {
            url1: {url: 'url1', 'num-reviews': undefined, rating: undefined}, 
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 4.3, 12]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, 1, 1]];

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        await expect(getReviewsToUpdate(productsInDBData, urlsInDBWithNewReview))
        .rejects.toThrow(`Both keys 'rating' and 'num-reviews' from 'productsInDB' are undefined in at least 1 product`);
    });
});

describe('updateInsertReviews', () => {

    it('Inserts new reviews in DB', async () => {

        const reviewsTableData = [[1, 4.0, 12], [2, 1.0, 12]];
        const reviewsData = [[1, 4.5, 15], [2, 3, null], [null, 3, 12], [null, null, 15], [null, 3, null]];

        const expectedReviewsData = [[1, 4.5, 15], [2, 3, 12], [3, 3, 12], [4, null, 15], [5, 3, null]];

        await reviews.fill(reviewsTableData);

        await updateInsertReviews(reviewsData)
        .then(async () => {
            const reviewsTable = await reviews.get();
            expect(reviewsTable).toStrictEqual(expectedReviewsData);
        })
    });

    it('should throw error, when trying to insert an non-exisiting id.', async () => {

        const reviewsTableData = [[1, 4.0, 12]];
        const reviewsData = [[2, 3, 2]];

        await reviews.fill(reviewsTableData);

        await expect(updateInsertReviews(reviewsData))
        .rejects.toThrow(`'id' from 'reviews' does not exist in DB, or duplicate 'id'`);
    });

    it('should throw error, when passing duplicate id.', async () => {

        const reviewsTableData = [[1, 4.0, 12]];
        const reviewsData = [[1, 3, 2], [1, 3, 4]];

        await reviews.fill(reviewsTableData);

        await expect(updateInsertReviews(reviewsData))
        .rejects.toThrow(`'id' from 'reviews' does not exist in DB, or duplicate 'id'`);
    });
});

describe('Function getInsertedIds_Reviews', () => {

    it('replaces indexes of idReviewToInsert, where hasReview is false, with null', () => {
        const idReviewToInsertData = [1, 2, 4];
        const hasReviewData = [true, true, false, true, false];

        const expectedOutput = [1, 2, null, 4, null]

        const output = getIdReviewToInsert(idReviewToInsertData, hasReviewData)
        
        expect(output).toStrictEqual(expectedOutput);
    });

    it('Too many \'true\', for number of ids in \'idReviewToInsertData\'', () => {
        const idReviewToInsertData = [1, 2, 4];
        const hasReviewData = [true, true, false, true, true];
        
        expect(() => getIdReviewToInsert(idReviewToInsertData, hasReviewData))
        .toThrow('Not enough ids in \'idReviewToInsert\', for number of \'true\' in \'hasReview\'');
    });

    it('Too many ids in \'idReviewToInsertData\', for number of \'true\' in \'hasReview\'', () => {
        const idReviewToInsertData = [1, 2, 4, 5, 6];
        const hasReviewData = [true, true, false, true, true];
        
        expect(() => getIdReviewToInsert(idReviewToInsertData, hasReviewData))
        .toThrow('Too many ids in \'idReviewToInsertData\', for number of \'true\' in \'hasReview\'');
    });
});

describe('Function updateInsertReviews', () => {

    it('Get inserted Ids in Review', async () => {
        const lenIdsToUpdate = 1;
        const hasReview = [true, true, false];
        const reviewsTableData = [[1, 4.0, 12], [2, 1.0, 12]];
        const reviewsToUpdateInsert = [[1, 4.5, 15], [2, 3, null], [null, 3, 12], [null, null, 15], [null, 3, null]];
        const expectedRes = {
            idReviewToUpdate: [3],
            idReviewToInsert: [4, 5, null],
        }

        await reviews.fill(reviewsTableData);

        await updateInsertReviews(reviewsToUpdateInsert);        
        await expect(getInsertedIds_Reviews(lenIdsToUpdate, hasReview)).resolves.toStrictEqual(expectedRes);
    });
});

describe('Function fillReviews', () => {

    it('Updates and inserts table reviews with the scraped products', async () => {
        const productsInDB = {
            url1: {url: 'url1', rating: 2, 'num-reviews': 12},
            url2: {url: 'url2', rating: 3, 'num-reviews': 33},
            url3: {url: 'url3', rating: 4.3, 'num-reviews': undefined},
            url4: {url: 'url4', rating: undefined, 'num-reviews': undefined},
        };

        const productsNotInDB = {
            url5: {url: 'url5', rating: 5, 'num-reviews': 55},
            url6: {url: 'url6', rating: undefined, 'num-reviews': 111},
            url7: {url: 'url7', rating: undefined, 'num-reviews': undefined},
        };

        const distributorsData = [[1, 'dist1', 'base1']];
        const reviewsData = [[1, 2.2, 13], [2, 4.2, 103], [3, 1.1, 11], [4, 4.4, 44]];
        const productsData = [[1, 'prod1', 'brand1', 'url1', null, 1, 1], [2, 'prod2', 'brand1', 'url2', null, null, 1],
                            [3, 'prod3', 'brand1', 'url3', null, 2, 1], [4, 'prod4', 'brand1', 'url4', null, 3, 1],
                            [5, 'prod5', 'brand1', 'url5', null, 4, 1]];

        const expectedVals = {
            idProdToUpdate: [2],
            idReviewToUpdate: [5],
            idReviewToInsert: [6, 7, null]
        };

        await distributors.fill(distributorsData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        await expect(fillReviews(productsInDB, productsNotInDB)).resolves.toStrictEqual(expectedVals);
    });
});