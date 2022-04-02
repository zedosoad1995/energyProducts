const {categories, distributors, products, productAttributes, prices, reviews} = require('../../src/db/dbModels');
const {getProductCatalogUrls, getProductUrlsInDB, getProductsInDB, getUrlToProductId, updateDBWithScrapedProducts} = require('../../src/db/queries.js');

jest.mock('../../src/utils/logger.js');

function dateToString(date){
    return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
}

describe('Function getProductCatalogUrls, to get list of all complete url paths from a specific distributor (joining tables categories and distributors)', () => {

    it('should return correct list of all full paths of distributor', async () => {
        categoriesData = [['name1', '/url1', 1], ['name2', '/url2', 1], ['name3', '/url3', 2]];
        distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];

        await distributors.fill(distributorsData);
        await categories.fill(categoriesData);

        expect(getProductCatalogUrls('dist1')).resolves.toStrictEqual(['base1/url1', 'base1/url2']);
        expect(getProductCatalogUrls('dist2')).resolves.toStrictEqual(['base2/url3']);
        expect(getProductCatalogUrls('dist3')).resolves.toStrictEqual([]);
    });

    it('should return empty array, when there is no data in the tables', async () => {
        distributors.truncate();

        expect(getProductCatalogUrls('dist1')).resolves.toStrictEqual([]);
    });

    it('should return empty array, when there is only data in table distributors', async () => {
        distributorsData = [['dist1', 'base1'], ['dist2', 'base2']];

        await distributors.fill(distributorsData);

        expect(getProductCatalogUrls('dist1')).resolves.toStrictEqual([]);
    });

});

describe('Function getProductUrlsInDB', () => {

    it('should return correct list of all full paths of distributor', async () => {
        const distributorsData = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];
        const productsData = [['prod1', 'brand1', 'url1', null, null, 1], ['prod2', 'brand2', 'url2', null, null, 1],
                        ['prod3', 'brand2', 'url3', null, null, 1], ['prod4', 'brand1', 'url4', null, null, 2]];
        const productAttributesData = [['attr1', 'val1', 'type', 1], ['attr2', 'val2', 'type', 1], ['attr3', 'val3', 'type', 2], ['attr4', 'val4', 'type', 4]];

        await distributors.fill(distributorsData);
        await products.fill(productsData);
        await productAttributes.fill(productAttributesData);

        getProductUrlsInDB('dist1')
        .then(({urlsWithAttributes, urlsNoAttributes}) => {
            expect(urlsWithAttributes).toStrictEqual(['url1', 'url2']);
            expect(urlsNoAttributes).toStrictEqual(['url3']);
        });
        getProductUrlsInDB('dist2')
        .then(({urlsWithAttributes, urlsNoAttributes}) => {
            expect(urlsWithAttributes).toStrictEqual(['url4']);
            expect(urlsNoAttributes).toStrictEqual([]);
        });
        getProductUrlsInDB('dist3')
        .then(({urlsWithAttributes, urlsNoAttributes}) => {
            expect(urlsWithAttributes).toStrictEqual([]);
            expect(urlsNoAttributes).toStrictEqual([]);
        });
    });
});

describe('Function getProductsInDB', () => {

    it('Returns 2 Objs, one containing the scraped products already in the DB, and another with the remaining', async () => {
        const productsInDBData = [{url: 'url1'}, {url: 'url2'}];
        const productsNotInDBData = [{url: 'url3'}, {url: 'url4'}];
        const allProducts = [...productsInDBData, ...productsNotInDBData];

        const distributorsData = [[1, 'dist1', 'base1']];
        const productsData = [['prod1', 'brand1', 'url1', null, null, 1], ['prod2', 'brand2', 'url2', null, null, 1]];

        distributors.fill(distributorsData);
        products.fill(productsData);

        await getProductsInDB(allProducts).then(({productsInDB, productsNotInDB}) => {
            expect(productsInDB).toStrictEqual({url1: {url: 'url1'}, url2: {url: 'url2'}});
            expect(productsNotInDB).toStrictEqual({url3: {url: 'url3'}, url4: {url: 'url4'}});
        })
    });
});

describe('Function getUrlToProductId', () => {

    it(`Returns dictionary with url as key, and id as the values, related to the products in the 'products' Table`, async () => {
        const distributorsTable = [[1, 'dist1', 'base1']];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', null, null, 1], [2, 'prod2', 'brand1', 'url2', null, null, 1]];

        const expectedOutput = {url1: 1, url2: 2};

        await distributors.fill(distributorsTable);
        await products.fill(productsTable);

        expect(getUrlToProductId()).resolves.toStrictEqual(expectedOutput);
    })
});

describe('Function updateDBWithScrapedProducts', () => {

    it(`Should Update the tables corretly with the new scraped products`, async () => {
        const today = new Date();

        const distributorsTable = [[1, 'dist1', 'base1'], [2, 'dist2', 'base2']];
        const categoriesTable = [[1, 'Esquentador', 'url1', 1], [2, 'Termoacumulador', 'url2', 1], 
                                [3, 'Esquentador', 'url3', 2], [4, 'Termoacumulador', 'url4', 2]];
        const reviewsTable = [[1, 4.3, 12], [2, 1, 1]];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', 1, null, 1], [2, 'prod2', 'brand1', 'url2', 4, 1, 2], 
                                [3, 'prod3', 'brand1', 'url3', 3, 2, 2]];
        const pricesTable = [[1, 12.6, '2020-01-01', 1], [2, 13.6, '2020-01-02', 1], [3, 14.6, today, 1], [4, 66, '2020-01-02', 2]];
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

        const expectedReviews = [[1, 4.5, 12], [2, 3, 2], [3, 3, 1], [4, 3, 2]];
        const expectedProducts = [[1, 'prod1', 'brand1', 'url1', 1, 3, 1], [2, 'prod2', 'brand1', 'url2', 4, 1, 2], 
                                [3, 'prod3', 'brand1', 'url3', 3, 2, 2], [4, 'prod4', 'brand1', 'url4', 1, 4, 1],
                                [5, 'prod5', 'brand1', 'url5', 4, null, 2]];
        const expectedPrices = [[1, 12.6, '2020-1-1', 1], [2, 13.6, '2020-1-2', 1], [3, 15, dateToString(today), 1], [4, 66, '2020-1-2', 2], 
                            [5, 15, dateToString(today), 2], [6, 666.66, dateToString(today), 3], [7, 1, dateToString(today), 4],
                            [8, 1, dateToString(today), 5]];
        const expectedProdAttributes = [[1, 'at1', '1', 'Number', 2], [2, 'at3', 'cha', 'String', 2], [3, 'at4', 'haha', 'String', 4], [4, 'at3', '4.4', 'Number', 1]];

        const urlsNoAttributes = ['url1', 'url3'];
        

        await distributors.fill(distributorsTable);
        await categories.fill(categoriesTable);
        await reviews.fill(reviewsTable);
        await products.fill(productsTable);
        await prices.fill(pricesTable);
        await productAttributes.fill(prodAttributesTable);

        await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)
        .then(async () => {
            const reviewsOut = await reviews.get();
            const productsOut = await products.get();
            const pricesOut = await prices.get();
            pricesOut.forEach((element, i) => {
                pricesOut[i][2] = dateToString(element[2]);
            });
            const productAttributesOut = await productAttributes.get();

            expect(reviewsOut).toStrictEqual(expectedReviews);
            expect(productsOut).toStrictEqual(expectedProducts);
            expect(pricesOut).toStrictEqual(expectedPrices);
            expect(productAttributesOut).toStrictEqual(expectedProdAttributes);
        });
    });
});