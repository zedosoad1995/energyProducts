require('dotenv').config({
    path: process.env.NODE_ENV === "test" ? ".env.test" : "env"
});

const express = require('express');
const bodyParser = require('body-parser');
const {router} = require('./routes');
const db = require('./db/config');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', router);

module.exports = app;