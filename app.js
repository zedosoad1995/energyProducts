const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
const {router} = require('./routes');
var db = require('./db/config');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', router)

app.listen(process.env.PORT, () => console.log(`App listening on port ${process.env.PORT}...`));