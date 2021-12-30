const dbConfig = require("./database");

const mysql = require('mysql');

const db = mysql.createConnection(dbConfig);

// Connect to db
db.connect(function(err) {
    if (err) throw err;
    console.log("Mysql Connected...");
});

module.exports = db;