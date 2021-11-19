require('dotenv').config();
const mysql = require('mysql');

var db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

// Connect to db
db.connect(function(err) {
    if (err) throw err;
    console.log("Mysql Connected...");
});

module.exports = db