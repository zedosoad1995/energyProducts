const {getProductsForDisplay} = require('../services/products.service');
const {waitForDbConnection} = require('../db/utils/connection');

async function main(){
    await waitForDbConnection();

    getProductsForDisplay({
        attributesToDisplay: ['EAN', 'Marca', 'Peso', 'Altura', 'distributor', 'category', 'rating', 'price', 'numReviews'], 
        attributesToSort: ['Peso'], 
        order: ['DESC'],
        filters: [['between', 'price', 100, 200]]
    }, 5, 60)
    .then(console.log)
    .catch(console.error);
}

main();