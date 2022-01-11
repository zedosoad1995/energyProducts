const {truncateAll, categories, distributors, products, productAttributes} = require('../../db/dbModels');
const {getProductCatalogUrls, getProductUrlsInDB, getProductsInDB} = require('../../db/queries.js');

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
        await truncateAll();

        expect(getProductCatalogUrls('dist1')).resolves.toStrictEqual([]);
    });

    it('should return empty array, when there is only data in table distributors', async () => {
        distributorsData = [['dist1', 'base1'], ['dist2', 'base2']];

        await truncateAll();
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