// const path = require('path');
// require('dotenv').config({
//   path: path.join(__dirname, '../.env')  // Load root .env from /api/
// });
// const mysql = require('mysql2');

// console.log('Env loaded - MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? 'Set' : 'Missing');
//  //LOCAL DATABASE CONFIG

//  const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: process.env.MYSQL_PASSWORD,
//   database: 'book_tracker'
// });
// // PRODUCTION DATABASE CONFIG
// // const connection = mysql.createConnection({
// //   host: 'mysql-256a92e-jainishmanani123-6a0c.k.aivencloud.com',
// //   port: '16445',
// //   user: 'avnadmin',
// //   password: process.env.MYSQL_PASSWORD_DEPLOY,
// //   database: 'book_tracker'
// // });
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL:', err.message, err.stack);
//     return;
//   }
//   console.log('Connected to MySQL');
// });
// module.exports = connection;

// ///////////////////////

// const path = require('path');
// require('dotenv').config({
//   path: path.join(__dirname, '../.env')  // Load root .env from /api/
// });
// const mysql = require('mysql2');
// const fs = require('fs');

// // Temp debug logs (remove after success)
// console.log('Env loaded - Host:', process.env.MYSQL_HOST ? 'Set' : 'Missing');
// console.log('Env loaded - User:', process.env.MYSQL_USER ? 'Set' : 'Missing');
// console.log('Env loaded - Password Deploy:', process.env.MYSQL_PASSWORD_DEPLOY ? 'Set' : 'Missing');

// // Create MySQL connection using environment variables
// const connection = mysql.createConnection({
//   host: process.env.MYSQL_HOST,
//   port: process.env.MYSQL_PORT || 3306,
//   user: process.env.MYSQL_USER,
//   password: process.env.MYSQL_PASSWORD_DEPLOY,
//   database: process.env.MYSQL_DATABASE,
//   ssl: {
//     ca: fs.readFileSync(path.join(__dirname, '../ca.pem'), 'utf8'),  // <-- Add 'utf8' for string
//     rejectUnauthorized: false  // <-- Temp: Bypass self-signed validation (secure with CA, but allows chain issues)
//   }
// });

// // Test connection (logs on startup)
// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL:', err.message, err.stack);
//     return;
//   }
//   console.log('Connected to MySQL');
// });

// module.exports = connection;

////////////////////

//Final working code after multiple fixes
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mysql = require("mysql2");
const fs = require("fs");

let pool = null;

function getPool() {
  if (pool) return pool;

  console.log("Creating MySQL connection pool...");

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD_DEPLOY,
    database: process.env.MYSQL_DATABASE,
    ssl: {
      ca: fs.readFileSync(path.join(__dirname, "../ca.pem")),
      rejectUnauthorized: false,
    },
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 10000,
    enableKeepAlive: true,
  });

  return pool;
}

function query(sql, params, callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }

  const db = getPool();

  const timeout = setTimeout(() => {
    callback(new Error("Query timed out after 25 seconds"), null);
  }, 25000);

  db.query(sql, params, (err, results, fields) => {
    clearTimeout(timeout);
    callback(err, results, fields);
  });
}

module.exports = { query };
