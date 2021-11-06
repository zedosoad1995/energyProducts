const axios = require('axios');
const cheerio = require("cheerio");
const fs = require('fs');
const Promise = require("bluebird");


var numbersKeys = ['Capacidade (L/min)', 'Pressão (bar)', 'Potência (W)', 'Peso', 'Altura', 'Largura', 'Profundidade', 'Temperatura Mínima (ºC)',
                    'Caudal Min.', 'Caudal Máx.', 'Potência (kW)', 'Pressão máxima (bar)', 'Tubo de Exaustão (mm)', 'Consumo de Gás (Gj/annum)', 'Temperatura Máxima (ºC)'];

var boolKeys = ['Regulador de temperatura', 'Válvula segurança', 'Válvula de descarga', 'Ecrã Digital',
                'Regulação débito gás', 'Regulação débito água', 'Comp.paineis solares', 'Interruptor on/off'];

var dateKeys = ['Garantia'];

async function getProductInfo(product, details){
    var product_obj = {};
    var exists = false;

    // Get basic info
    product_obj['name'] = product['name'];
    product_obj['brand'] = product['brand'];
    product_obj['color'] = product['color'];
    product_obj['energy-class'] = product['energy-class'];
    product_obj['description'] = product['description'];
    product_obj['rating'] = Number(product['rating_bazaar']);
    product_obj['num-reviews'] = Number(product['reviews_bazaar']);
    product_obj['categories'] = product['category_path'][product['category_path'].length-1];
    product_obj['url'] = product['default_url'];

    var productIdx = scrapedProducts.findIndex(el =>el.url == product['default_url']);
    if(productIdx != -1){
        exists = true;
    }

    var today = new Date();
    var todayStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    if(exists){
        var existingProduct = scrapedProducts[productIdx];
        product_obj['prices'] = existingProduct['prices'];

        let lastPrice = existingProduct['prices'][existingProduct['prices'].length-1];
        if(product['price'] != lastPrice['value']){
            if(todayStr == lastPrice['date']){
                product_obj['prices'][product_obj['prices'].length-1] = product['price'];
            }else{
                product_obj['prices'].push({'date': todayStr, 'value': product['price']});
            }
        }
    }else{
        product_obj['prices'] = [{'date': todayStr, 'value': product['price']}];
    }

    console.log(product_obj['url']);

    // Get more details of product
    if(true){//details && !exists){

        await axios.get("https://www.worten.pt" + product['default_url']).then(resp => {
            const $ = cheerio.load(resp.data);

            product_obj['more-details'] = {};

            $("li[class='clearfix']").each(function (i, e) {
                let key = $(e).find('.details-label').contents().last().text();
                product_obj['more-details'][key] = $(e).find('.details-value').text();
                // Funcao para conversao de tipo
                if(numbersKeys.includes(key)){
                    let convValue = Number(product_obj['more-details'][key].split(' ')[0].replace(",", ".").replace(/[A-Za-z]/g, ''));
                    if(!isNaN(convValue)){
                        product_obj['more-details'][key] = convValue;
                    }
                }
                else if(boolKeys.includes(key)){
                    product_obj['more-details'][key] = (product_obj['more-details'][key] == "Sim") ? true : false;
                }
            })

        }).catch(function (error) {
            console.log(error);
        });
    }

    if(exists){
        scrapedProducts[productIdx] = product_obj;
    }else{
        scrapedProducts.push(product_obj);
    }
}


async function getProdutosTipo(url, details = false){

    const axiosConfig = {
        headers: {
            'x-render-partials': 'true',
            'x-render-events': 'product_filters:changed',
        }
    };
    let pageNum = 1;

    lastPage = false;

    while(!lastPage){

        var model;

        var success = true;
        await axios.get(url + "?x-event-type=product_list%3Arefresh&page=" + pageNum, axiosConfig).then(resp => {

            // Find JSON with products
            for(let module of Object.values(resp.data["modules"])){
                if(module['model']['template'] == 'product_list'){
                    model = module['model'];
                    break;
                }
            }

        }).catch(function (error) {
            console.log(error);
            success = false;
        });
        if(!success || model === undefined){
            return;
        }

        if(!('products' in model)){
            console.log("ERROR: No Key 'products'");
            return;
        }

        // get product details
        await Promise.map(model['products'],
            (product) => getProductInfo(product, details),
            { concurrency: 3 }
        ).catch((error) => console.log(error));


        if(!('max' in model['offset'] && 'offsetMax' in model)){
            console.log("ERROR: No Key 'offset' or 'offsetMax'");
            return;
        }
        if(model['offset']['max'] >= model['offsetMax']){
            lastPage = true;
        }

        pageNum++;

    }
}

// Helper functions
const loadData = (path) => {
    try {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch (err) {
        return [];
    }
}

const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data));
    } catch (err) {
        console.error(err);
    }
}

// Lista numa pasta
const listUrls = ["https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores",
                    "https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/termoacumuladores"];


var scrapedProducts = loadData("resources/wortenData.json");

// Function que faz scraping e faz update da variavel.
// Depois gravar e error handling
Promise.map(listUrls,
    url => getProdutosTipo(url, true),
    { concurrency: 2 }
).then(() => {
    console.log(scrapedProducts.length);
    storeData(scrapedProducts, "resources/wortenData.json");
}).catch((error) => console.log(error));