const {categories, distributors, prices, products, productAttributes, reviews} = require('../../db/dbModels');
const {getDistributorIds, getCategoryIds, getProductsToInsert} = require('../../db/insertUpdateProdHelper/products.js');

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