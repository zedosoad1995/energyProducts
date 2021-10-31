const axios = require('axios');


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

        await axios.get("https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores?x-event-type=product_list%3Arefresh&page=" + pageNum, axiosConfig).then(resp => {

            for(let module of Object.values(resp.data["modules"])){
                if(module['model']['template'] == 'product_list'){
                    var model = module['model'];
                    //console.log(model);
                }
            }

            for(let product of model['products']){
                console.log("name:", product['name']);
                console.log("brand:", product['brand']);
                console.log("color:", product['color']);
                console.log("energy-class:", product['energy-class']);
                console.log("description:", product['description']);
                console.log("price:", product['price']);
                console.log("rating:", product['rating_bazaar']);
                console.log("num reviews:", product['reviews_bazaar']);
                console.log();
            }

            if(model['offset']['max'] >= model['offsetMax']){
                lastPage = true;
            }

        });

        pageNum++;

    }
}

getEsquentadores();