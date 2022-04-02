const {categories, distributors, products, productAttributes, prices, reviews} = require('../../src/db/dbModels');
const {updateDBWithScrapedProducts} = require('../../src/db/queries.js');
const pricesHelper = require('../../src/db/insertUpdateProdHelper/prices.js');

jest.mock('../../src/utils/logger.js');

function dateToString(date){
    return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
}

jest.mock('../../src/db/insertUpdateProdHelper/prices.js', () => {
    const original = jest.requireActual('../../src/db/insertUpdateProdHelper/prices.js');
    return {
      ...original,
      fillPrices: jest.fn()
    };
});

describe('Function updateDBWithScrapedProducts Error', () => {

    it(`Should throw error when there is something wrong with the function, and then rollback, recovering the state of the tables.`, async () => {

        const today = new Date();

        const distributorsTable = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];
        const categoriesTable = [[1, 'Esquentador', 'url1', 1], [2, 'Termoacumulador', 'url2', 1], 
                                [3, 'Esquentador', 'url3', 2], [4, 'Termoacumulador', 'url4', 2]];
        const reviewsTable = [[1, 4.3, 12], [2, 1, 1]];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', 1, null, 1], [2, 'prod2', 'brand1', 'url2', 4, 1, 2], 
                                [3, 'prod3', 'brand1', 'url3', 3, 2, 2]];
        const pricesTable = [[1, 12.6, '2020-1-1', 1], [2, 13.6, '2020-1-2', 1], [3, 14.6, dateToString(today), 1], [4, 66, '2020-1-2', 2]];
        const prodAttributesTable = [[1, 'at1', '1', 'Number', 2], [2, 'at3', 'cha', 'String', 2]];

        // undef price?
        // TODO: make price in table of type price (or something like that)
        const scrapedProds = [{url: 'url1', 'more-details': {at3: 4.4}, rating: 3, 'num-reviews': 1, price: 15},
                                {url: 'url2', rating: 4.5, 'num-reviews': undefined, price: 15},
                                {url: 'url3', rating: 3, 'num-reviews': 2, price: 666.66},
                                {url: 'url4', name: 'prod4', brand: 'brand1', distributor: 'dist1', category: 'Esquentador', 
                                'more-details': {at4: 'haha'}, rating: 3, 'num-reviews': 2, price: 1},
                                {url: 'url5', name: 'prod5', brand: 'brand1', distributor: 'dist2', category: 'Termoacumulador', 
                                rating: undefined, price: 1}];

        const urlsNoAttributes = ['url1', 'url3'];
        
        await distributors.fill(distributorsTable);
        await categories.fill(categoriesTable);
        await reviews.fill(reviewsTable);
        await products.fill(productsTable);
        await prices.fill(pricesTable);
        await productAttributes.fill(prodAttributesTable);

        pricesHelper.fillPrices.mockRejectedValueOnce(new Error());
        
        await expect(updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)).rejects.toThrow();

        const reviewsOut = await reviews.get();
        const productsOut = await products.get();
        const pricesOut = await prices.get();
        pricesOut.forEach((element, i) => {
            pricesOut[i][2] = dateToString(element[2]);
        });
        const productAttributesOut = await productAttributes.get();

        expect(reviewsOut).toStrictEqual(reviewsTable);
        expect(productsOut).toStrictEqual(productsTable);
        expect(pricesOut).toStrictEqual(pricesTable);
        expect(productAttributesOut).toStrictEqual(prodAttributesTable);
    });
});