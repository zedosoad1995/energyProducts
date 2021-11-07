const express = require('express');

const { wortenScraper } = require('../controllers')

const router = express.Router();

router.get('/blogpost', wortenScraper);

module.exports = {
    router
}