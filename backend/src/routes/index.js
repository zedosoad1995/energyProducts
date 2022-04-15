const express = require('express');

const { scrape, getProducts, getAllAttrNames } = require('../controllers')

const router = express.Router();

router.post('/scrape', scrape);

router.post('/products', getProducts);

router.get('/productAttrNames', getAllAttrNames);

module.exports = {
    router
}