let axios = require('axios');
const cheerio = require("cheerio");
const _ = require('lodash');
const {convertProductAttribute} = require('./utils');

/*
Classe eficiência energética - Eficiência Energética
Consumo de energia anual - Consumo de Gás (Gj/annum) -> (kwh -> Gj, a conversao e feita com Gj*277.778)
Capacidade - Capacidade (L/min)
Potência - Potência (kW) / Potência (kW)_low / Potência (kW)_high / Potência (W) -> Tem os erros no auchan. Ha 1 com pot 529.1, mas penso que seja 5-29.1
Dimensões LxAxP - Largura / Altura / Profundidade -> mm - cm
Outras características - Mais Informações
ean - EAN
Tipo de Gás - Tipo de gás
Ignição - Tipo de ignição
*/

const attributesDict = {
    'Classe eficiência energética': 'Eficiência Energética',
    'Consumo de energia anual': 'Consumo de Gás (Gj/annum)',
    'Capacidade': 'Capacidade (L/min)',
    'Potência': 'Potência (kW)',
    'Outras características': 'Mais Informações',
    'Tipo de Gás': 'Tipo de gás',
    'Ignição': 'Tipo de ignição'
}

function assignProductAttribute(prodAttributes, key, value){
    if(key === 'Dimensões LxAxP'){
        // TODO: Há valores que são erros humanos. Rever
        [largura, altura, profundidade] = value.replace(/[\sm]/g, '').split(/[xX]+/);

        prodAttributes['Largura'] = largura ? String(Number(largura)/10) : null;
        prodAttributes['Altura'] = altura ? String(Number(altura)/10) : null;
        prodAttributes['Profundidade'] = profundidade ? String(Number(profundidade)/10) : null;
        return;
    }

    if(key in attributesDict){
        key = attributesDict[key];
    }

    prodAttributes[key] = convertProductAttribute(key, value, 'Auchan');
}

function getProductDetails(url){
    return axios.get(url)
        .then(resp => {
            const $ = cheerio.load(resp.data);

            let prodAttributes = { url }
            $('h3.attribute-name').each((i, e) => {
                const attrName = $(e).text().trim();
                const attrValue = $(`li.attribute-values`).eq(i).text().trim();

                assignProductAttribute(prodAttributes, attrName, attrValue);
            });

            prodAttributes['EAN'] = $('span.product-ean').text()

            return prodAttributes;
        })
        .catch(err => {
            throw(err);
        });
}

function normalizeProductDetails(mainDetailsArr, otherDetailsArr){
    prodDetailsArr = []

    mainDetailsArr.forEach(mainDetails => {
        otherDetails = otherDetailsArr.find(obj => obj['url'] === mainDetails['url']);
        let allDetails = {...mainDetails, ...otherDetails};

        allDetails['category'] = allDetails['category'].split('/').pop();
        allDetails['distributor'] = 'Auchan';
        allDetails['rating'] = null;
        allDetails['num-reviews'] = null;

        allDetails = _.omit(allDetails, ['Marca', 'dimension6', 'dimension7', 'dimension11', 'id', 'Modelo', 'Marca', 'position']);

        prodDetailsArr.push(allDetails);
    })



    return prodDetailsArr;
}

class AuchanScraper{

    static #baseUrl = 'https://www.auchan.pt';

    constructor(){
    }

    async getProducts(url){

        let offset = 0;
        const size = 10;

        let scrapedProducts = [];

        while(true){
            const numProducts = await axios.get(url + `&start=${offset}&sz=${size}`)
                .then(async resp => {
                    const $ = cheerio.load(resp.data);

                    let prodDetailsPromises = [];
                    let mainProdsDetails = [];
                    $('div.auc-product > div.product > div').each(async (_, e) => {
                        const prodPath = JSON.parse($(e).attr('data-urls'))['productUrl'];
                        const prodUrl = AuchanScraper.#baseUrl + prodPath;

                        let mainProdDetails = JSON.parse($(e).attr('data-gtm'));
                        mainProdDetails['url'] = prodUrl;
                        mainProdsDetails.push(mainProdDetails);

                        prodDetailsPromises.push(getProductDetails(prodUrl));
                    });

                    const productDetails = await Promise.all(prodDetailsPromises)
                        .catch(err => {
                            throw(err);
                        });

                    scrapedProducts.push(...normalizeProductDetails(mainProdsDetails, productDetails));

                    return prodDetailsPromises.length;
                });
            
            if(numProducts <= 0) break;

            offset += size;
        }

        return scrapedProducts;
    }
}

const scraper = new AuchanScraper();
scraper.getProducts('https://www.auchan.pt/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Search-UpdateGrid?cgid=aquecimento-agua&srule=price-high-to-low&prefn1=soldInStores&prefv1=000&isSort=true')
.then(prods => {
    let attributes = {};

    prods.forEach(prod => {
        Object.entries(prod).forEach(([key, val]) => {
            if(key in attributes){
                attributes[key].push(val);
            }else{
                attributes[key] = [val];
            }
        })
    })

    console.log(attributes);
});

module.exports = {
    AuchanScraper
}

/*
Classe eficiência energética - Eficiência Energética
Consumo de energia anual - Consumo de Gás (Gj/annum) -> (kwh -> Gj, a conversao e feita com Gj*277.778)
Capacidade - Capacidade (L/min)
Potência - Potência (kW) / Potência (kW)_low / Potência (kW)_high / Potência (W) -> Tem os erros no auchan. Ha 1 com pot 529.1, mas penso que seja 5-29.1
Dimensões LxAxP - Largura / Altura / Profundidade -> mm - cm
Outras características - Mais Informações
ean - EAN
Informação de Marketing - Mais Informações
Tipo de Gás - Tipo de gás
Ignição - Tipo de ignição
Regulador de temperatura - Regulador de temperatura
*/