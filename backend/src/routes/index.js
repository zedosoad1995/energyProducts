const express = require('express');

const { wortenScraper, getProducts, getAllAttrNames } = require('../controllers')

const router = express.Router();

router.post('/scrapeWorten', wortenScraper);

router.post('/products', getProducts);

router.get('/productAttrNames', getAllAttrNames);

module.exports = {
    router
}