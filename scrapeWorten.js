const axios = require('axios');
const cheerio = require("cheerio");

async function getEsquentadores(){

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

        await axios.get("https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores?x-event-type=product_list%3Arefresh&page=" + pageNum, axiosConfig).then(resp => {

            for(let module of Object.values(resp.data["modules"])){
                if(module['model']['template'] == 'product_list'){
                    model = module['model'];
                }
            }

        });

        for(let product of model['products']){
            console.log("name:", product['name']);
            console.log("brand:", product['brand']);
            console.log("color:", product['color']);
            console.log("energy-class:", product['energy-class']);
            console.log("description:", product['description']);
            console.log("price:", product['price']);
            console.log("rating:", product['rating_bazaar']);
            console.log("num reviews:", product['reviews_bazaar']);
            console.log("url:", product['default_url']);

            await axios.get("https://www.worten.pt" + product['default_url']).then(resp => {
                //console.log(resp.data);
                const $ = cheerio.load(resp.data);

                $("li[class='clearfix']").each(function (i, e) {
                    console.log($(e).find('.details-label').contents().last().text() + ":",
                                $(e).find('.details-value').text());
                });

            })

            console.log();

        }

        if(model['offset']['max'] >= model['offsetMax']){
            lastPage = true;
        }

        pageNum++;

    }
}

getEsquentadores();