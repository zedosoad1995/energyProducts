const axios = require('axios');
const cheerio = require("cheerio");
const Promise = require("bluebird");
const {Worten} = require('../data/attributesTypes.json');

const numberKeys = Worten['Numbers'];
const boolKeys = Worten['Booleans'];

function convertProdAttribute(val, type){
    if(type === 'Number'){
        const convValueStr = val.trim()
                            .split(' ')[0]
                            .replace(/[^\d.,\/-]/g, ' ')
                            .replace(",", ".")
                            .replace("..", ".")

        if(/^\d+(?:\.\d+)?[\/-]\d+(?:\.\d+)?/.test(convValueStr))
            return convValueStr.match(/^(\d+(?:\.\d+)?)[\/-](\d+(?:\.\d+)?)/).slice(1).map(Number);

        const convValue = Number(convValueStr);
        
        // TODO: Logging, para quando ha valor invalido (pensar tb sobre como resolver throw)
        if(convValueStr.trim().length === 0 || convValueStr[0] === ' ' || isNaN(convValue)) 
            throw new Error(`Invalid format for attribute type Number. Value received: ${val}`);

        return convValue;

    }else if(type === 'Bool'){
        if(val === 'Sim'){
            return true;
        }else if(val === 'Não'){
            return false;
        }else{
            throw new Error(`Invalid boolean value to convert. It can only have the following values: Sim, Não.\nInstead it has the value: ${val}`);
        }
    }

    return val
}

async function getProductInfo(scrapedProducts, product, urlsWithAttributes){
    let productObj = {};

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

    //console.log(productObj['url']);

    const hasProductAttributesInDB = urlsWithAttributes.includes(productObj['url']);

    // Get more details of product. Assumes these values are static, therefore it only obtains once (when it is a new product)
    if(!hasProductAttributesInDB){

        await axios.get("https://www.worten.pt" + product['default_url']).then(resp => {
            const $ = cheerio.load(resp.data);

            productObj['more-details'] = {};

            // Get all elements from html list (with info about product)
            $("li[class='clearfix']").each(function (_, e) {
                const key = $(e).find('.details-label').contents().last().text();
                const attrValue = $(e).find('.details-value').text();

                let attrType = 'NoType';
                if(numberKeys.includes(key)) attrType = 'Number'
                else if(boolKeys.includes(key)) attrType = 'Bool'

                const convertedVal = convertProdAttribute(attrValue, attrType);

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

    scrapedProducts.push(productObj);
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

async function getWortenProducts(url, urlsWithAttributes){

    const axiosConfig = {
        headers: {
            'x-render-partials': 'true',
            'x-render-events': 'product_filters:changed',
        }
    };
    
    let pageNum = 1;

    lastPage = false;

    let scrapedProducts = [];

    while(!lastPage){

        const urlPage = url + "?sort_by=name&x-event-type=product_list%3Arefresh&page=" + pageNum;
        let productsInfo = await getPageProductsInfo(urlPage, axiosConfig);

        // get product details
        // TODO: return val, instead of pass by reference
        await Promise.map(productsInfo['products'],
            product => getProductInfo(scrapedProducts, product, urlsWithAttributes),
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

    return scrapedProducts;
}

module.exports = {
    getWortenProducts,
    getPageProductsInfo,
    convertProdAttribute
}