const db = require('./config');
const util = require('util');

const dbQuery = util.promisify(db.query).bind(db);

async function seed(){
    const distributorsQuery = `
        INSERT IGNORE INTO 
            distributors (name, url)
        VALUES 
            ('Worten', 'https://www.worten.pt');`;

    const categoriesQuery = `
        INSERT IGNORE INTO 
            categories (name, url, distributorID)
        VALUES 
            ('Esquentador', '/grandes-eletrodomesticos/aquecimento-de-agua/esquentadores', 1),
            ('Termoacumulador', '/grandes-eletrodomesticos/aquecimento-de-agua/termoacumuladores', 1);`;

    const queries = [distributorsQuery, categoriesQuery];

    queries.forEach(async (query) => {
        await dbQuery(query)
        .catch(err => {
            throw err
        });
    });
}

module.exports = {
    seed
}