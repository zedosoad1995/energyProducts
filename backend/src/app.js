require('dotenv').config({
    path: process.env.NODE_ENV === "test" ? ".env.test" : "env"
});

const express = require('express');
const bodyParser = require('body-parser');
const {router} = require('./routes');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(_, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use('/api/v1', router);

module.exports = app;