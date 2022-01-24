const {productAttributes, distributors, products} = require('../../db/dbModels');
const {fillProductAttributes} = require('../../db/insertUpdateProdHelper/productAttributes.js');

describe('Function fillProductAttributes', () => {

    it(``, async () => {
        const distributorsTable = [[1, 'dist1', 'base1']];
        const productsTable = [[1, 'prod1', 'brand1', 'url1', null, null, 1], [2, 'prod2', 'brand1', 'url2', null, null, 1]];

        const productsNotInDB = {url1: {'more-details': {at1: 1, at2: null, at3: 'cha'}, url: 'url1'}};
        const productsInDBWithNewAttr = {url2: {'more-details': {at1: 7, at4: 'gra', at3: 'wii'}, url: 'url2'}};
        const urlToProductId = {url1: 1, url2: 2};

        const expectedOutput = [[1, 'at1', '1', 'Number', 1], [2, 'at3', 'cha', 'String', 1], [3, 'at1', '7', 'Number', 2], 
                                [4, 'at4', 'gra', 'String', 2], [5, 'at3', 'wii', 'String', 2]];

        distributors.fill(distributorsTable);
        products.fill(productsTable);

        await fillProductAttributes(productsNotInDB, urlToProductId, productsInDBWithNewAttr)
        .then(async () => {
            const output = await productAttributes.get()
            expect(output).toStrictEqual(expectedOutput);
        })
    });
});