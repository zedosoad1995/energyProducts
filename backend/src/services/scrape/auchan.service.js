let axios = require('axios');
const cheerio = require("cheerio");
const _ = require('lodash');
const {convertAttributeValue, translateCategory} = require('./scrapeHelper');
const {logger} = require('../../utils/logger')


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

function normalizeProductDetails(mainDetailsArr, otherDetailsArr){
    prodDetailsArr = []

    mainDetailsArr.forEach(mainDetails => {
        otherDetails = otherDetailsArr.find(obj => obj['url'] === mainDetails['url']);
        let allDetails = {...mainDetails, ...otherDetails};

        allDetails['category'] = translateCategory(allDetails['category'].split('/').pop());
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
    #existingAttrNames;

    constructor(attrNames){
        this.#existingAttrNames = attrNames;
    }

    getProductDetails(url){
        return axios.get(url)
            .then(resp => {
                const $ = cheerio.load(resp.data);
                const that = this
    
                let prodAttributes = { url }
                $('h3.attribute-name').each((i, e) => {
                    const attrName = $(e).text().trim();
                    const attrValue = $(`li.attribute-values`).eq(i).text().trim();
    
                    const convertedObj = convertAttributeValue(attrName, attrValue, 'Auchan', url);
                    prodAttributes = {...prodAttributes, ...convertedObj};

                    const convKey = Object.keys(convertedObj)[0]
                    if(!that.#existingAttrNames.includes(convKey)){
                        that.#existingAttrNames.push(convKey);
                        logger.info(`New Attribute Added: '${convKey}', from product: ${url}`);
                    }
                });
    
                prodAttributes['EAN'] = $('span.product-ean').text()
    
                return prodAttributes;
            })
            .catch(err => {
                throw(err);
            });
    }
    

    async getProducts(url){

        let offset = 0;
        const size = 10;

        let scrapedProducts = [];

        const that = this

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

                        prodDetailsPromises.push(that.getProductDetails(prodUrl));
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

const scraper = new AuchanScraper([]);
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