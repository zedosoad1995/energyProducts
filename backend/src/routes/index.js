const express = require('express');

const { wortenScraper, getProducts } = require('../controllers')

const router = express.Router();

router.post('/scrapeWorten', wortenScraper);

router.post('/products', getProducts);

module.exports = {
    router
}