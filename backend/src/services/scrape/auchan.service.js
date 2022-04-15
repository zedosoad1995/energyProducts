let axios = require('axios');
const cheerio = require("cheerio");
const _ = require('lodash');
const {convertAttributeValue, translateCategory} = require('./scrapeHelper');
const {logger} = require('../../utils/logger')

function popMainAttributes(catalogDetails){
    let obj = {}

    obj['name'] = catalogDetails['name']; delete catalogDetails['name']
    obj['price'] = catalogDetails['price']; delete catalogDetails['price']
    obj['brand'] = catalogDetails['brand']; delete catalogDetails['brand']
    obj['url'] = catalogDetails['url']; delete catalogDetails['url']
    obj['category'] = translateCategory(catalogDetails['category'].split('/').pop()); delete catalogDetails['category']

    obj['distributor'] = 'Auchan';
    obj['rating'] = null;
    obj['num-reviews'] = null;

    return obj
}

function normalizeProductDetails(catalogDetailsArr, prodDetailsArr){
    normalizedProdArr = []

    catalogDetailsArr.forEach(catalogDetails => {
        prodDetails = prodDetailsArr.find(obj => obj['url'] === catalogDetails['url']);

        let normalizedProd = popMainAttributes(catalogDetails)

        let allDetails = {...catalogDetails, ...prodDetails}
        const toDrop = ['Marca', 'dimension6', 'dimension7', 'dimension11', 'id', 'Modelo', 'Marca', 'position', 'url']
        allDetails = _.omit(allDetails, toDrop);

        normalizedProd['more-details'] = allDetails

        normalizedProdArr.push(normalizedProd)
    })

    return normalizedProdArr;
}

class AuchanScraper{

    static #baseUrl = 'https://www.auchan.pt';
    #existingAttrNames;

    constructor(attrNames){
        this.#existingAttrNames = attrNames;
    }

    getProductPageDetails(url){
        return axios.get(url)
            .then(resp => {
                const $ = cheerio.load(resp.data);
                const that = this
    
                let prodAttributes = { url }
                $('h3.attribute-name').each((i, e) => {
                    const attrName = $(e).text().trim();
                    const attrValue = $(`li.attribute-values`).eq(i).text().trim();
    
                    const convertedObj = convertAttributeValue(attrName, attrValue, 'Auchan', url);
                    prodAttributes = {...prodAttributes, ...convertedObj};

                    const convKey = Object.keys(convertedObj)[0]
                    if(!that.#existingAttrNames.includes(convKey)){
                        that.#existingAttrNames.push(convKey);
                        logger.info(`New Attribute Added: '${convKey}', from product: ${url}`);
                    }
                });
    
                prodAttributes['EAN'] = $('span.product-ean').text()
    
                return prodAttributes;
            })
            .catch(err => {
                throw(err);
            });
    }

    async getProductDetails(webpage){
        const $ = cheerio.load(webpage);
        const that = this

        let productPageDetailsPromises = [];
        let catalogPageDetails = [];
        $('div.auc-product > div.product > div').each(async (_, e) => {
            const prodPath = JSON.parse($(e).attr('data-urls'))['productUrl'];
            const prodUrl = AuchanScraper.#baseUrl + prodPath;

            let catalogProduct = JSON.parse($(e).attr('data-gtm'));
            catalogProduct['url'] = prodUrl;
            catalogPageDetails.push(catalogProduct);

            productPageDetailsPromises.push(that.getProductPageDetails(prodUrl));
        });

        const productPageDetails = await Promise.all(productPageDetailsPromises)
            .catch(err => {
                throw(err);
            });

        return [catalogPageDetails, productPageDetails]
    }
    

    async getProducts(url){

        let offset = 0;
        const size = 10;

        let scrapedProducts = [];

        while(true){
            let fullUrl = url + '&srule=price-high-to-low&prefn1=soldInStores&prefv1=000&isSort=true' + 
                            `&start=${offset}&sz=${size}`
            const numProducts = await axios.get(fullUrl)
                .then(async resp => {
                    const [catalogPageDetails, productPageDetails] = await this.getProductDetails(resp.data)

                    scrapedProducts.push(...normalizeProductDetails(catalogPageDetails, productPageDetails));

                    return productPageDetails.length;
                });
            
            if(numProducts <= 0) break;
            offset += size;
        }

        return scrapedProducts;
    }
}

module.exports = {
    AuchanScraper
}