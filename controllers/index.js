const { getProdutosTipo } = require('../services')
const Promise = require("bluebird");

const storeData = (data, path) => {
    try {
        fs.writeFileSync(path, JSON.stringify(data));
    } catch (err) {
        console.error(err);
    }
}

const wortenScraper = async (req, res, next) => {

    var path = "../resources/wortenData.json";
    const listUrls = ["https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores",
                    "https://www.worten.pt/grandes-eletrodomesticos/aquecimento-de-agua/termoacumuladores"];

    await Promise.map(listUrls,
        url => getProdutosTipo(url, path, true),
        { concurrency: 2 }
    ).then((ret) => {
        console.log(ret.length);
        storeData(ret, path);
    }).then(() => {
        res.sendStatus(201);
    }).catch((error) => {
        console.log(error);
        res.sendStatus(500) && next(error);
    });

}

module.exports = {
    wortenScraper
}