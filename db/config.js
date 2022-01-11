const dbConfig = require("./database");

const mysql = require('mysql');

const db = mysql.createConnection(dbConfig);

db.connect(function(err) {
    if (err) throw err;
});

module.exports = db;