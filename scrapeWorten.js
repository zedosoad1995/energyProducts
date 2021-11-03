const axios = require('axios');
const cheerio = require("cheerio");
const fs = require('fs');
const Promise = require("bluebird");


var numbersKeys = ['Capacidade (L/min)', 'Pressão (bar)', 'Potência (W)', 'Peso', 'Altura', 'Largura', 'Profundidade', 'Temperatura Mínima (ºC)',
                    'Caudal Min.', 'Caudal Máx.', 'Potência (kW)', 'Pressão máxima (bar)', 'Tubo de Exaustão (mm)', 'Consumo de Gás (Gj/annum)'];

var numbersRemoveEndKeys = {'Temperatura Máxima (ºC)': ' ºC'};

var boolKeys = ['Regulador de temperatura', 'Válvula segurança', 'Válvula de descarga', 'Ecrã Digital',
                'Regulação débito gás', 'Regulação débito água', 'Comp.paineis solares', 'Interruptor on/off'];

var dateKeys = ['Garantia'];

async function getProductInfo(product, details){
    var product_obj = {};
    var exists = false;

    var existingProducts = scrapedProducts.filter(function (el) {
        return el.url == product['default_url'];
    });
    if(existingProducts.length > 0){
        exists = true;
        //var indexProduct = scrapedProducts.indexOf(existingProduct[0]);
        var existingProduct = existingProducts[0];
    }

    product_obj['name'] = product['name'];
    product_obj['brand'] = product['brand'];
    product_obj['color'] = product['color'];
    product_obj['energy-class'] = product['energy-class'];
    product_obj['description'] = product['description'];
    product_obj['rating'] = Number(product['rating_bazaar']);
    product_obj['num-reviews'] = Number(product['reviews_bazaar']);
    product_obj['categories'] = product['category_path'][product['category_path'].length-1];
    product_obj['url'] = product['default_url'];

    var today = new Date();
    var todayStr = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    if(exists){
        let lastPrice = existingProduct['prices'][existingProduct['prices'].length-1];
        if(product['price'] != lastPrice['value']){
            if(todayStr == lastPrice['date']){
                lastPrice = product['price'];
            }else{
                existingProduct['prices'].push({'date': todayStr, 'value': product['price']});
            }
        }
    }else{
        product_obj['prices'] = [{'date': todayStr, 'value': product['price']}];
    }

    console.log(product_obj['url']);

    if(details && !exists){

        await axios.get("https://www.worten.pt" + product['default_url']).then(resp => {
            const $ = cheerio.load(resp.data);

            product_obj['more-details'] = {};

            $("li[class='clearfix']").each(function (i, e) {
                let key = $(e).find('.details-label').contents().last().text();
                product_obj['more-details'][key] = $(e).find('.details-value').text();
                if(numbersKeys.includes(key)){
                    product_obj['more-details'][key] = Number(product_obj['more-details'][key]);
                }
                else if(key in numbersRemoveEndKeys){
                    product_obj['more-details'][key] = Number(product_obj['more-details'][key].substring(0, numbersRemoveEndKeys[key].length));
                }
                else if(boolKeys.includes(key)){
                    product_obj['more-details'][key] = (product_obj['more-details'][key] == "Sim") ? true : false;
                }
            });

        }).catch(function (error) {
            console.log(error);
        });
        //console.log();
    }

    if(exists){
        existingProduct = product_obj;
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

            for(let module of Object.values(resp.data["modules"])){
                if(module['model']['template'] == 'product_list'){
                    model = module['model'];
                }
            }

        }).catch(function (error) {
            console.log(error);
            success = false;
        });
        if(!success){
            return;
        }

        if(!('products' in model)){
            console.log("ERROR: No Key 'products'");
            return;
        }

        await Promise.map(model['products'],
            (product) => getProductInfo(product, details),
            { concurrency: 3 }
        ).catch((error) => console.log(error));


        if(!('max' in model['offset'] || 'offsetMax' in model)){
            console.log("ERROR: No Key 'offset' or 'offsetMax'");
            return;
        }
        if(model['offset']['max'] >= model['offsetMax']){
            lastPage = true;
        }

        pageNum++;

    }
}

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

const listUrls = ["https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores",
                    "https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/termoacumuladores"];


var scrapedProducts = loadData("resources/wortenData.json");

Promise.map(listUrls,
    url => getProdutosTipo(url, true),
    { concurrency: 2 }
).then(() => {
    console.log(scrapedProducts.length);
    storeData(scrapedProducts, "resources/wortenData.json");
}).catch((error) => console.log(error));