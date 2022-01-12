const {distributors, products, reviews, prices} = require('../../db/dbModels');
const {getChangedPrices, getFirstPrices_ProdInDB, upsertPrices} = require('../../db/insertUpdateProdHelper/prices.js');

function dateToString(date){
    return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
}

describe('Function getChangedPrices', () => {

    it(`Returns object with prices that already existed in the DB but changed. One list with 'pricesChangedNotSameDay' where the new price is in a different day
    and 'pricesChangedSameDay' where the price has been changed in the same day.`, async () => {
        const today = new Date();
        
        const distributorsTable = [[1, 'dist1', 'base1']];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', null, null, 1], [2, 'prod2', 'brand1', 'url2', null, null, 1],
                        [3, 'prod3', 'brand1', 'url3', null, null, 1], [4, 'prod4', 'brand1', 'url4', null, null, 1],
                        [5, 'prod5', 'brand1', 'url5', null, null, 1], [6, 'prod6', 'brand1', 'url6', null, null, 1]];
        const pricesTable = [[1, 1.3, '2020-08-01', 1], [2, 12.6, today, 2], [3, 59.9, '2021-09-20', 3], [4, 69.9, '2021-09-21', 3],
                             [5, 10, '2021-09-21', 5], [6, 11, '2020-09-21', 6]];

        const expectedOutput = {pricesChangedNotSameDay: [[null, 1.5, today, 1]], pricesChangedSameDay: [[2, 13, today, null]]};

        const productsInDB = {url1: {url: 'url1', price: 1.5}, url2: {url: 'url2', price: 13}, url3: {url: 'url3', price: 69.9}, 
                            url6: {url: 'url6', price: undefined}};
        const urlToProductId = {url1: 1, url2: 2, url3: 3, url4: 4, url5: 5, url6: 6};
        const prodIdToUrl_InDB = {1: 'url1', 2: 'url2', 3: 'url3', 6: 'url6'};

        distributors.fill(distributorsTable);
        products.fill(productsTable);
        prices.fill(pricesTable);

        await expect(getChangedPrices(productsInDB, urlToProductId, prodIdToUrl_InDB, today)).resolves.toStrictEqual(expectedOutput);
    })
});

describe('Function getFirstPrices_ProdInDB', () => {

    it(``, async () => {
        const today = new Date();
        
        const distributorsTable = [[1, 'dist1', 'base1']];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', null, null, 1], [2, 'prod2', 'brand1', 'url2', null, null, 1],
                        [3, 'prod3', 'brand1', 'url3', null, null, 1], [4, 'prod4', 'brand1', 'url4', null, null, 1],
                        [5, 'prod5', 'brand1', 'url5', null, null, 1], [6, 'prod6', 'brand1', 'url6', null, null, 1]];
        const pricesTable = [[2, 12.6, today, 2], [3, 59.9, '2021-09-20', 3], [4, 69.9, '2021-09-21', 3],
                             [5, 10, '2021-09-21', 5], [6, 11, '2020-09-21', 6]];

        const expectedOutput = [[null, 1.5, today, 1]];

        const productsInDB = {url1: {url: 'url1', price: 1.5}, url2: {url: 'url2', price: 13}, url3: {url: 'url3', price: 69.9}, 
                            url6: {url: 'url6', price: undefined}};
        const prodIdToUrl_InDB = {1: 'url1', 2: 'url2', 3: 'url3', 6: 'url6'};

        distributors.fill(distributorsTable);
        products.fill(productsTable);
        prices.fill(pricesTable);

        await expect(getFirstPrices_ProdInDB(productsInDB, prodIdToUrl_InDB, today)).resolves.toStrictEqual(expectedOutput);
    })
});

describe('Function upsertPrices', () => {

    it(``, async () => {
        const today = new Date();
        
        const distributorsTable = [[1, 'dist1', 'base1']];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', null, null, 1], [2, 'prod2', 'brand1', 'url2', null, null, 1],
                        [3, 'prod3', 'brand1', 'url3', null, null, 1], [4, 'prod4', 'brand1', 'url4', null, null, 1],
                        [5, 'prod5', 'brand1', 'url5', null, null, 1], [6, 'prod6', 'brand1', 'url6', null, null, 1]];
        const pricesTable = [[2, 12.6, '2021-09-21', 2], [3, 59.9, '2021-09-20', 3], [4, 69.9, '2021-09-21', 3],
                             [5, 10, '2021-09-21', 5], [6, 11, '2020-09-21', 6]];

        const pricesToUpsert = [[null, 1.1, '2021-9-21', 1], [2, 13, null, null], [null, 70, '2021-9-21', 3]];
        const expectedOutput = [[2, 13, '2021-9-21', 2], [3, 59.9, '2021-9-20', 3], [4, 69.9, '2021-9-21', 3],
                                [5, 10, '2021-9-21', 5], [6, 11, '2020-9-21', 6], [7, 1.1, '2021-9-21', 1], [8, 70, '2021-9-21', 3]];

        distributors.fill(distributorsTable);
        products.fill(productsTable);
        prices.fill(pricesTable);

        await upsertPrices(pricesToUpsert)
        .then(async () => {
            const finalPrices = await prices.get();
            finalPrices.forEach((element, i) => {
                finalPrices[i][2] = dateToString(element[2]);
            });

            expect(finalPrices).toStrictEqual(expectedOutput);
        });
    })
});