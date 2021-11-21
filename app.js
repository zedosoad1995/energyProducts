const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const {router} = require('./routes');
const {getAllProductUrls, getProductUrlsByDistributor} = require('./db/queries');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', router)

app.listen(process.env.PORT, () => console.log(`App listening on port ${process.env.PORT}...`));


setTimeout(function(){ 

    getAllProductUrls().then((results) => {
        console.log(results);
    }).catch((err) => {
        console.log(err);
    });

    getProductUrlsByDistributor('Worten').then((results) => {
        console.log(results);
    }).catch((err) => {
        console.log(err);
    });


 }, 3000);