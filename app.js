const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();

const {router} = require('./routes');

var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'energy_products'
});

require('dotenv').config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', router)

db.connect(function(err) {
    if (err) throw err;
    console.log("Mysql Connected...");
});

app.listen(process.env.PORT, () => console.log(`App listening on port ${process.env.PORT}!`));