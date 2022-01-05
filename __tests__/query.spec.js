const db = require('../db/config');
const {truncateAll, fillCategories, fillDistributors, fillProductAttributes, fillProducts} = require('../db/truncateTables');
const {seed} = require('../db/seed');
const {getProductCatalogUrls, getProductUrlsInDB} = require('../db/queries.js');

const util = require('util');
const dbEnd = util.promisify(db.end).bind(db);

function waitFor(conditionFunction) {
    const poll = resolve => {
        if(conditionFunction()) resolve();
        else setTimeout(_ => poll(resolve), 400);
    }
  
    return new Promise(poll);
}

describe('Function getProductCatalogUrls, to get list of all complete url paths from a specific distributor (joining tables categories and distributors)', () => {

    beforeAll(async () => {
        await waitFor(() => db.state === 'authenticated');
        await truncateAll();
        await seed();
    });

    it('should return correct list of all full paths of distributor', async () => {
        categoriesData = [['name1', '/url1', 1], ['name2', '/url2', 1], ['name3', '/url3', 2]];
        distributorsData = [['dist1', 'base1'], ['dist2', 'base2']];

        await fillDistributors(distributorsData);
        await fillCategories(categoriesData);

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
        await fillDistributors(distributorsData);

        expect(getProductCatalogUrls('dist1')).resolves.toStrictEqual([]);
    });
});

describe('Function getProductUrlsInDB, to get list of all complete url paths from a specific distributor (joining tables categories and distributors)', () => {

    afterAll(async () => {
        await dbEnd()
        .catch(err => console.log(err));
    });

    it('should return correct list of all full paths of distributor', async () => {
        distributorsData = [['dist1', 'base1'], ['dist2', 'base2']];
        productsData = [['prod1', 'brand1', 'url1', null, null, 1], ['prod2', 'brand2', 'url2', null, null, 1],
                        ['prod3', 'brand2', 'url3', null, null, 1], ['prod4', 'brand1', 'url4', null, null, 2]];
        productAttributesData = [['attr1', 'val1', 'type', 1], ['attr2', 'val2', 'type', 1], ['attr3', 'val3', 'type', 2], ['attr4', 'val4', 'type', 4]];

        await fillDistributors(distributorsData);
        await fillProducts(productsData);
        await fillProductAttributes(productAttributesData);

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