const axios = require('axios');
const cheerio = require("cheerio");
const Promise = require("bluebird");


var numberKeys = ['Capacidade (L/min)', 'Pressão (bar)', 'Potência (W)', 'Peso', 'Altura', 'Largura', 'Profundidade', 'Temperatura Mínima (ºC)',
                    'Caudal Min.', 'Caudal Máx.', 'Potência (kW)', 'Pressão máxima (bar)', 'Tubo de Exaustão (mm)', 'Consumo de Gás (Gj/annum)', 'Temperatura Máxima (ºC)'];

var boolKeys = ['Regulador de temperatura', 'Válvula segurança', 'Válvula de descarga', 'Ecrã Digital',
                'Regulação débito gás', 'Regulação débito água', 'Comp.paineis solares', 'Interruptor on/off'];

var dateKeys = ['Garantia'];

async function getProductInfo(scrapedProducts, product){
    var productObj = {};
    var isNewProduct = true;

    // Get basic info
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

    //var productIdx = scrapedProducts.findIndex(el => el.url == product['default_url']);
    //if(productIdx != -1){
    //    isNewProduct = false;
    //}

    //var today = new Date();
    //var todayStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();

    /*if(isNewProduct){
        productObj['prices'] = [{'date': todayStr, 'value': product['price']}];
    }else{
        productObj['prices'] = scrapedProducts[productIdx]['prices'];

        let lastPrice = productObj['prices'][productObj['prices'].length-1];

        // Check if price has changed
        if(product['price'] != lastPrice['value']){
            // Replace value saved today (extreme case when price changes on the same day)
            if(todayStr == lastPrice['date']){
                productObj['prices'][productObj['prices'].length-1] = product['price'];
            }else{
                productObj['prices'].push({'date': todayStr, 'value': product['price']});
            }
        }
    }*/

    console.log(productObj['url']);

    // Get more details of product. Assumes these values are static, therefore it only obtains once (when it is a new product)
    if(isNewProduct){

        await axios.get("https://www.worten.pt" + product['default_url']).then(resp => {
            const $ = cheerio.load(resp.data);

            productObj['more-details'] = {};

            // Get all elements from html list (with info about product)
            $("li[class='clearfix']").each(function (i, e) {
                let key = $(e).find('.details-label').contents().last().text();
                productObj['more-details'][key] = $(e).find('.details-value').text();

                // TODO: Funcao para conversao de tipo
                // Converts into correct type
                if(numberKeys.includes(key)){
                    let convValue = Number(productObj['more-details'][key]
                                    .split(' ')[0]
                                    .replace(",", ".")
                                    .replace(/[A-Za-z]/g, ''));
                    if(!isNaN(convValue)){
                        productObj['more-details'][key] = convValue;
                    }else{
                        productObj['more-details'][key] = null;
                    }
                }
                else if(boolKeys.includes(key)){
                    productObj['more-details'][key] = (productObj['more-details'][key] == "Sim") ? true : false;
                }
            })

        }).catch(function (error) {
            console.log(error);
        });
    }

    // Insert new product in DB


    scrapedProducts.push(productObj);

    /*if(isNewProduct){
        scrapedProducts.push(productObj);
    }else{
        scrapedProducts[productIdx] = productObj;
    }*/
}


const getWortenProducts = async (url) => {

    const axiosConfig = {
        headers: {
            'x-render-partials': 'true',
            'x-render-events': 'product_filters:changed',
        }
    };
    let pageNum = 1;

    lastPage = false;

    var scrapedProducts = [];

    while(!lastPage){

        var productsInfo;
        var pageSuccess = true;
        await axios.get(url + "?x-event-type=product_list%3Arefresh&page=" + pageNum, axiosConfig).then(resp => {

            // Find JSON with products
            for(let module of Object.values(resp.data["modules"])){
                if(module['model']['template'] === 'product_list'){
                    productsInfo = module['model'];
                    break;
                }
            }

        }).catch(function (error) {
            console.log(error);
            pageSuccess = false;
        });
        if(!pageSuccess || productsInfo === undefined){
            console.log("Could not find products on page " + pageNum);
            return;
        }

        if(!('products' in productsInfo)){
            console.log("ERROR: No Key 'products'");
            return;
        }

        // get product details
        await Promise.map(productsInfo['products'],
            (product) => getProductInfo(scrapedProducts, product),
            { concurrency: 6 }
        ).catch((error) => {
            console.log(error)
        });


        if(!('max' in productsInfo['offset'] && 'offsetMax' in productsInfo)){
            console.log("ERROR: No Key 'offset' or 'offsetMax'");
            return;
        }

        // Check last page
        if(productsInfo['offset']['max'] >= productsInfo['offsetMax']){
            lastPage = true;
        }

        pageNum++;

    }

    return scrapedProducts;
}

module.exports = {
    getWortenProducts
}