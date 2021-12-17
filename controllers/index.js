const { getWortenProducts } = require('../services/wortenService');
const Promise = require("bluebird");
const fs = require('fs');
const {getProductUrlsByDistributor, updateInsertProducts} = require('../db/queries');

const urls = require('../resources/urlsToScrape.json');
var wortenPath = "./resources/wortenData.json";


const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data));
    } catch(error) {
        throw new Error(error);
    }
}

const loadData = (path) => {
    try {
        if (fs.existsSync(path)) {
            return JSON.parse(fs.readFileSync(path, 'utf8'));
        }else{
            return [];
        }
    } catch (error) {
        throw new Error(error);
    }
}

const wortenScraper = async (req, res, next) => {
    let urls;
    await getProductUrlsByDistributor('Worten').then((results) => {
        urls = results.map(result => {
            return result['fullUrl'];
        })
    }).catch((err) => {
        res.sendStatus(500)
        throw err;
    });

    // scrape products
    /*var scrapedProds = await Promise.map(urls,
        url => getWortenProducts(url),
        { concurrency: 2 }
    ).catch((error) => {
        console.log(error);
        res.sendStatus(500) && next(error);
        return;
    });

    scrapedProds = [].concat.apply([], scrapedProds);*/

    const scrapedProds = [
        {
            name: 'a',
            brand: 'brand',
            url: '/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores/esquentador-junex-pl-11-vde-11-l-ventilado-gas-butano-propano-7260251',
            distributor: 'Worten',
            categories: 'Esquentadores',
            rating: 4.899,
            'num-reviews': 1111,
            price: 12344
        },
        {
            name: 'a1',
            brand: 'brand1',
            url: '/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores/esquentador-vulcano-wrd-14-4-kg-23-14-l-atmosferico-gas-natural-7334633',
            distributor: 'Worten',
            categories: 'Esquentadores',
            rating: 1,
            'num-reviews': 1000,
            price: 1.12
        },
        {
            name: 'a2',
            brand: 'brand2',
            url: '/url',
            distributor: 'Worten',
            categories: 'Esquentadores',
            rating: 1.5,
            'num-reviews': 20,
            price: 123
        }
    ];

    await updateInsertProducts(scrapedProds).catch(error => {
        console.log(error);
    });

    res.sendStatus(201);

}

module.exports = {
    wortenScraper
}