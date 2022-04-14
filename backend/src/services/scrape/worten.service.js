let axios = require('axios');
const cheerio = require("cheerio");
const Promise = require("bluebird");
const {logger} = require('../../utils/logger');
const {convertAttributeValue, translateCategory} = require('./scrapeHelper');

function getPageProductsInfo(url, axiosConfig){
    return axios.get(url, axiosConfig)
        .then(resp => {

            // Find JSON with products
            for(let module of Object.values(resp.data["modules"])){
                if(!('model' in module)) continue;

                if(module['model']['template'] === 'product_list'){

                    if(!('products' in module['model']))
                        throw new Error('No \'products\' key in modules > model.');

                    return module['model'];
                }
            }
            throw new Error('No \'product_list\' key in modules > model.');
        })
        .catch(err => {
            throw err;
        });
}

class WortenScraper{
    #urlsWithAttributes;
    #prodAttrNames;
    #scrapedProducts;

    constructor(urls, attrNames){
        this.#urlsWithAttributes = urls;
        this.#prodAttrNames = attrNames;
        this.#scrapedProducts = [];
    }

    async #getProductInfo(product){
        let productObj = {};
        const that = this;

        // Get basic info
        productObj['distributor'] = 'Worten';
        productObj['name'] = product['name'];
        productObj['brand'] = product['brand'];
        productObj['color'] = product['color'];
        productObj['energy-class'] = product['energy-class'];
        productObj['description'] = product['description'];
        productObj['rating'] = (isNaN(Number(product['rating_bazaar'])))? null: Number(product['rating_bazaar']);
        productObj['num-reviews'] = (isNaN(Number(product['reviews_bazaar'])))? null: Number(product['reviews_bazaar']);
        productObj['category'] = translateCategory(product['category_path'][product['category_path'].length-1]);
        productObj['url'] = "https://www.worten.pt" + product['default_url'];
        productObj['price'] = product['price'];

        const productDetailsUrl = productObj['url']
        const hasProductAttributesInDB = this.#urlsWithAttributes.includes(productObj['url']);

        // Get more details of product. Assumes these values are static, therefore it only obtains once (when it is a new product)
        if(!hasProductAttributesInDB){

            await axios.get(productDetailsUrl, axiosConfig).then(resp => {
                const $ = cheerio.load(resp.data);

                productObj['more-details'] = {};

                // Get all elements from html list (with info about product)
                $("li[class='clearfix']").each(function (_, e) {
                    const key = $(e).find('.details-label').contents().last().text();
                    const attrValue = $(e).find('.details-value').text();

                    if(!that.#prodAttrNames.includes(key)){
                        that.#prodAttrNames.push(key);
                        logger.info(`New Attribute Added: '${key}', from product: ${productDetailsUrl}`);
                    }

                    const convertedVal = convertAttributeValue(key, attrValue, 'Worten');
                    productObj['more-details'] = {...productObj['more-details'], ...convertedVal};
                })
            }).catch(function (error) {
                throw error;
            });
        }

        this.#scrapedProducts.push(productObj);
    }

    async getProducts(url){

        const axiosConfig = {
            headers: {
                'x-render-partials': 'true',
                'x-render-events': 'product_filters:changed',
            }
        };
        
        let pageNum = 1;
        let lastPage = false;

        this.scrapedProducts = [];

        while(!lastPage){

            const urlPage = url + "?sort_by=name&x-event-type=product_list%3Arefresh&page=" + pageNum;
            let productsInfo = await getPageProductsInfo(urlPage, axiosConfig);

            // get product details
            await Promise.map(productsInfo['products'],
                product => this.#getProductInfo(product),
                { concurrency: 6 }
            )
            .catch((error) => {
                throw error;
            });

            if(!('offset' in productsInfo && 'max' in productsInfo['offset'] && 'offsetMax' in productsInfo))
                throw new Error("No Key 'offset' or 'offsetMax'");

            // Check last page
            if(productsInfo['offset']['max'] >= productsInfo['offsetMax'])
                lastPage = true;

            pageNum++;
        }

        return this.#scrapedProducts;
    }
}

module.exports = {
    WortenScraper,
    getPageProductsInfo,
    convertProdAttribute
}