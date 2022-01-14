jest.unmock('../../db/insertUpdateProdHelper/reviews.js');

const {categories, distributors, products, reviews} = require('../../db/dbModels');
const {getDistributorIds, getCategoryIds, getProductsToInsert, getProductsToUpdate, updateInsertProducts} = require('../../db/insertUpdateProdHelper/products.js');

jest.mock('../../db/insertUpdateProdHelper/reviews.js', () => {
    const original = jest.requireActual('../../db/insertUpdateProdHelper/reviews.js');
    return {
      ...original
    };
  });

describe('Function getDistributorIds', () => {

    it('Obtains a list of Ids of the Distributors in the scraped products that do not yet exist in the DB', async () => {
        const productsNotInDB = {
            url1: {distributor: 'dist1'},
            url2: {distributor: 'dist2'},
            url3: {distributor: 'dist1'}
        };

        const distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];

        const expectedDistributorIds = [1, 2, 1];

        await distributors.fill(distributorsData);

        await expect(getDistributorIds(productsNotInDB)).resolves.toStrictEqual(expectedDistributorIds);
    });

    it('Throws error when there is an undefined value', async () => {
        const productsNotInDB = {
            url1: {distributor: undefined}
        };

        const distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];

        await distributors.fill(distributorsData);

        await expect(getDistributorIds(productsNotInDB)).rejects.toThrow(`undefined value in key 'distributor'`);
    });
});

describe('Function getCategoryIds', () => {

    it('Obtains a list of Ids of the Distributors in the scraped products that do not yet exist in the DB', async () => {
        const productsNotInDB = {
            url1: {distributor: 'dist1', categories: 'Esquentadores'},
            url2: {distributor: 'dist2', categories: 'Esquentadores'},
            url3: {distributor: 'dist1', categories: 'Termoacumuladores'}
        };
        const distributorIds = [1, 2, 1];

        const distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];
        const categoriesData = [[1, 'Esquentador', 'url1', 1], [2, 'Termoacumulador', 'url2', 1], 
                                [3, 'Esquentador', 'url3', 2], [4, 'Termoacumulador', 'url4', 2]];

        const expectedDistributorIds = [1, 3, 2];

        await distributors.fill(distributorsData);
        await categories.fill(categoriesData);

        await expect(getCategoryIds(productsNotInDB, distributorIds)).resolves.toStrictEqual(expectedDistributorIds);
    });

    it('Throws error when there is an undefined value', async () => {
        const productsNotInDB = {
            url1: {categories: undefined}
        };
        const distributorIds = [1, 2, 1];

        await expect(getCategoryIds(productsNotInDB, distributorIds)).rejects.toThrow(`undefined value in key 'categories'`);
    });
});

describe('Function getProductsToInsert', () => {

    it('Obtains a list of Ids of the Distributors in the scraped products that do not yet exist in the DB', async () => {
        const productsNotInDB = {
            url1: {distributor: 'dist1', categories: 'Esquentadores', name: 'prod1', brand: 'brand1', url: 'url1'},
            url2: {distributor: 'dist2', categories: 'Esquentadores', name: 'prod2', brand: 'brand1', url: 'url2'},
            url3: {distributor: 'dist1', categories: 'Termoacumuladores', name: 'prod3', brand: 'brand2', url: 'url3'}
        };
        const idReviewsToInsert = [null, 1, 3];
        
        const distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];
        const categoriesData = [[1, 'Esquentador', 'url1', 1], [2, 'Termoacumulador', 'url2', 1], 
                                [3, 'Esquentador', 'url3', 2], [4, 'Termoacumulador', 'url4', 2]];

        const expectedVal = [[null, 'prod1', 'brand1', 'url1', 1, 1, null],
                            [null, 'prod2', 'brand1', 'url2', 3, 2, 1],
                            [null, 'prod3', 'brand2', 'url3', 2, 1, 3]];

        await distributors.fill(distributorsData);
        await categories.fill(categoriesData);

        await expect(getProductsToInsert(productsNotInDB, idReviewsToInsert)).resolves.toStrictEqual(expectedVal);
    });

    it(`Throws error when 'productsNotInDB' and 'idReviewsToInsert' have different length`, async () => {
        const productsNotInDB = {
            url1: {distributor: 'dist1', categories: 'Esquentadores', name: 'prod1', brand: 'brand1', url: 'url1'},
            url2: {distributor: 'dist2', categories: 'Esquentadores', name: 'prod2', brand: 'brand1', url: 'url2'},
            url3: {distributor: 'dist1', categories: 'Termoacumuladores', name: 'prod3', brand: 'brand2', url: 'url3'}
        };
        const idReviewsToInsert = [null, 1];
        
        const distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];
        const categoriesData = [[1, 'Esquentador', 'url1', 1], [2, 'Termoacumulador', 'url2', 1], 
                                [3, 'Esquentador', 'url3', 2], [4, 'Termoacumulador', 'url4', 2]];

        await distributors.fill(distributorsData);
        await categories.fill(categoriesData);

        await expect(getProductsToInsert(productsNotInDB, idReviewsToInsert))
        .rejects.toThrow(`'productsNotInDB' and 'idReviewsToInsert' have different length`);
    });
});

describe('Function getProductsToUpdate', () => {

    it('Get Products to update (only updates reviewID)', async () => {
        const idProdToUpdate = [1, 2, 3];
        const idReviewToUpdate = [2, 6, 7];

        const expectedVal = [[1, null, null, null, null, null, 2],
                            [2, null, null, null, null, null, 6],
                            [3, null, null, null, null, null, 7]];

        expect(getProductsToUpdate(idProdToUpdate, idReviewToUpdate)).toStrictEqual(expectedVal);
    });

    it(`Throws error when 'productsNotInDB' and 'idReviewsToInsert' have different length`, async () => {
        const idProdToUpdate = [1, null, 3];
        const idReviewToUpdate = [2, 6, 7];

        expect(() => getProductsToUpdate(idProdToUpdate, idReviewToUpdate)).toThrow(`Input array contains invalid elements. All must be Numbers.`);
    });
});

describe('Function updateInsertProducts', () => {

    it('Obtains a list of Ids of the Distributors in the scraped products that do not yet exist in the DB', async () => {
        
        const distributorsData = [[1, 'dist1', 'base1']];
        const categoriesData = [[1, 'Esquentador', 'url1', 1]];
        const reviewsData = [[1, 2.2, 13], [2, 4.2, 103], [3, 4.3, 103]];
        const productsData= [[1, 'prod1', 'brand1', 'url1', 1, 3, 1], [2, 'prod2', 'brand1', 'url2', 1, null, 1]];

        const productsToUpsert = [[null, 'prod_a', 'brand_a', 'url_a', 1, 1, 1], [null, 'prod_b', 'brand1', 'url_b', 1, 1, null],
                                [2, null, null, null, null, null, 2]];

        const expectedProds = [[1, 'prod1', 'brand1', 'url1', 1, 3, 1], [2, 'prod2', 'brand1', 'url2', 1, 2, 1],
                                [3, 'prod_a', 'brand_a', 'url_a', 1, 1, 1], [4, 'prod_b', 'brand1', 'url_b', 1, null, 1]];

        await distributors.fill(distributorsData);
        await categories.fill(categoriesData);
        await reviews.fill(reviewsData);
        await products.fill(productsData);

        await updateInsertProducts(productsToUpsert)
        .then(async () => {
            const prodsOutput = await products.get()
            expect(prodsOutput).toStrictEqual(expectedProds);
        })
    });
});