const express = require('express');

const { wortenScraper } = require('../controllers')

const router = express.Router();

// TODO: Change to POST
router.post('/scrapeWorten', wortenScraper);

module.exports = {
    router
}