const axios = require('axios');
const cheerio = require("cheerio");
const fs = require('fs');
const Promise = require("bluebird");


async function getProductInfo(product, details){
    product_obj = {};
    product_obj['name'] = product['name'];
    product_obj['brand'] = product['brand'];
    product_obj['color'] = product['color'];
    product_obj['energy-class'] = product['energy-class'];
    product_obj['description'] = product['description'];
    product_obj['price'] = product['price'];
    product_obj['rating'] = product['rating_bazaar'];
    product_obj['num-reviews'] = product['reviews_bazaar'];
    product_obj['categories'] = product['category_path'];
    product_obj['url'] = product['default_url'];

    console.log(product_obj['url']);

    /*console.log("name:", product['name']);
    console.log("brand:", product['brand']);
    console.log("color:", product['color']);
    console.log("energy-class:", product['energy-class']);
    console.log("description:", product['description']);
    console.log("price:", product['price']);
    console.log("rating:", product['rating_bazaar']);
    console.log("num reviews:", product['reviews_bazaar']);
    console.log("categories:", product['category_path']);
    console.log("url:", product['default_url']);*/

    if(details){

        await axios.get("https://www.worten.pt" + product['default_url']).then(resp => {
            const $ = cheerio.load(resp.data);

            $("li[class='clearfix']").each(function (i, e) {
                //console.log($(e).find('.details-label').contents().last().text() + ":",
                //            $(e).find('.details-value').text());
                product_obj[$(e).find('.details-label').contents().last().text()] = $(e).find('.details-value').text();
            });

        }).catch(function (error) {
            console.log(error);
        });
        //console.log();
    }

    scrapedProducts.push(product_obj);
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
        console.error(err);
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

//num_started_scrapes = 0;

Promise.map(listUrls,
    url => getProdutosTipo(url, true),
    { concurrency: 2 }
).then(() => {
    console.log(scrapedProducts.length);
    storeData(scrapedProducts, "resources/wortenData.json");
}).catch((error) => console.log(error));

/*
for(let url of listUrls){
    num_started_scrapes++;
    getProdutosTipo(url, false).then(() => {
        num_started_scrapes--;
        if(num_started_scrapes == 0){
            console.log(scrapedProducts.length);
            storeData(scrapedProducts, "resources/wortenData.json");
        }
    });
}
*/