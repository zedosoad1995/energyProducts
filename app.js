const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const {router} = require('./routes')


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//app.get('/', (req, res) => res.send('App is working'))

app.use('/api', router)

app.listen(3000, () => console.log('App listening on port 3000!'));