let axios = require('axios');
const cheerio = require("cheerio");
const Promise = require("bluebird");
const {Worten} = require('../data/attributesTypes.json');
const {logger} = require('../../utils/logger');

const antiIPBanConfigs = require('../utils/ipBlockedAxiosConfigs');

const numberKeys = Worten['Numbers'];
const boolKeys = Worten['Booleans'];

function convertProdAttribute(val, type, key, url){
    if(type === 'Number'){
        const convValueStr = val.trim()
                            .split(' ')[0]
                            .replace(/[^\d.,\/-]/g, ' ')
                            .replace(",", ".")
                            .replace("..", ".")

        if(/^\d+(?:\.\d+)?[\/-]\d+(?:\.\d+)?/.test(convValueStr))
            return convValueStr.match(/^(\d+(?:\.\d+)?)[\/-](\d+(?:\.\d+)?)/).slice(1).map(Number).map(String);

        const convValue = String(Number(convValueStr));
        
        if(convValueStr.trim().length === 0 || convValueStr[0] === ' ' || isNaN(convValue)){
            logger.warn(`Invalid format for attribute type Number. Value received: '${val}' for attribute ${key} in '${url}'`);
        }

        return convValue;

    }else if(type === 'Bool'){
        if(val === 'Sim'){
            return 'true';
        }else if(val === 'Não'){
            return 'false';
        }else{
            logger.warn(`Invalid boolean value to convert. It can only have the following values: Sim, Não.\nInstead it has the value: ${val}`);
            throw new Error(`Invalid boolean value to convert. It can only have the following values: Sim, Não.\nInstead it has the value: ${val}`);
        }
    }

    return val
}

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
    #newAttributes;

    constructor(urls, attrNames){
        this.#urlsWithAttributes = urls;
        this.#prodAttrNames = attrNames;
        this.#scrapedProducts = [];
        this.#newAttributes = [];
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
        productObj['categories'] = product['category_path'][product['category_path'].length-1];
        productObj['url'] = product['default_url'];
        productObj['price'] = product['price'];

        const productDetailsUrl = "https://www.worten.pt" + productObj['url']
        const hasProductAttributesInDB = this.#urlsWithAttributes.includes(productObj['url']);

        // Get more details of product. Assumes these values are static, therefore it only obtains once (when it is a new product)
        if(!hasProductAttributesInDB){
            const axiosConfig = {
                headers: antiIPBanConfigs
            };

            await axios.get(productDetailsUrl, axiosConfig).then(resp => {
                const $ = cheerio.load(resp.data);

                productObj['more-details'] = {};

                // Get all elements from html list (with info about product)
                $("li[class='clearfix']").each(function (_, e) {
                    const key = $(e).find('.details-label').contents().last().text();
                    const attrValue = $(e).find('.details-value').text();

                    if(!(that.#prodAttrNames.includes(key) || that.#newAttributes.includes(key))){
                        that.#newAttributes.push(key);
                        logger.info(`New Attribute Added: '${key}', from product: ${productDetailsUrl}`);
                    }

                    let attrType = 'NoType';
                    if(numberKeys.includes(key)){
                        attrType = 'Number';
                    }else if(boolKeys.includes(key)){
                        attrType = 'Bool';
                    }

                    const convertedVal = convertProdAttribute(attrValue, attrType, key, productDetailsUrl);

                    if(Array.isArray(convertedVal)){
                        productObj['more-details'][key+'_low'] = convertedVal[0];
                        productObj['more-details'][key+'_high'] = convertedVal[1];
                    }else{
                        productObj['more-details'][key] = convertedVal;
                    }
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

        // Anti IP ban
        axiosConfig['headers'] = {...axiosConfig['headers'], ...antiIPBanConfigs};
        
        let pageNum = 1;
        let lastPage = false;

        this.scrapedProducts = [];

        while(!lastPage){

            const urlPage = url + "?sort_by=name&x-event-type=product_list%3Arefresh&page=" + pageNum;
            let productsInfo = await getPageProductsInfo(urlPage, axiosConfig);

            // get product details
            // TODO: return val, instead of pass by reference
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