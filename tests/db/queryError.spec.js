const {truncateAll, categories, distributors, products, productAttributes, prices, reviews} = require('../../db/dbModels');
const {updateDBWithScrapedProducts} = require('../../db/queries.js');
const rev = require('../../db/insertUpdateProdHelper/reviews.js');

const delay = ms => new Promise(res => setTimeout(res, ms));

function dateToString(date){
    return date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate();
}

jest.mock('../../db/insertUpdateProdHelper/reviews.js', () => {
    const original = jest.requireActual('../../db/insertUpdateProdHelper/reviews.js');
    return {
      ...original,
      fillReviews: jest.fn()
    };
});

describe('Function updateDBWithScrapedProducts', () => {

    it(`Should Update the tables corretly with the new scraped products`, async () => {

        // undef price?
        // TODO: make price in table of type price (or something like that)
        const scrapedProds = [{url: 'url1', 'more-details': {at3: 4.4}, rating: 3, 'num-reviews': 1, price: 15},
                                {url: 'url2', rating: 4.5, 'num-reviews': undefined, price: 15},
                                {url: 'url3', rating: 3, 'num-reviews': 2, price: 666.66},
                                {url: 'url4', name: 'prod4', brand: 'brand1', distributor: 'dist1', categories: 'Esquentadores', 
                                'more-details': {at4: 'haha'}, rating: 3, 'num-reviews': 2, price: 1},
                                {url: 'url5', name: 'prod5', brand: 'brand1', distributor: 'dist2', categories: 'Termoacumuladores', 
                                rating: undefined, price: 1}];

        const urlsNoAttributes = ['url1', 'url3'];

        //const spy = jest.spyOn(rev, 'fillReviews')

        rev.fillReviews.mockRejectedValueOnce(new Error('fat'));
        //await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes);
        try{
            await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes);
        }catch(e){
            expect(e.message).toEqual('a');
        }


        //await delay(2000);
        //spy.mockRejectedValueOnce(new Error('fat'));
        //rev.fillReviews.mockRejectedValueOnce(new Error('fa'));
        //await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes);
        //jest.restoreMock('../../db/insertUpdateProdHelper/reviews.js');
        //await expect(updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)).rejects.toThrow('fat');
        //console.log('done');
        //rev.fillReviews.mockRejectedValueOnce(new Error('nice'));

        /*await updateDBWithScrapedProducts(scrapedProds, urlsNoAttributes)
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
        });*/
    });
});