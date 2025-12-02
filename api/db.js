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


const path = require('path');
require('dotenv').config({ 
  path: path.join(__dirname, '../.env')
});

const mysql = require('mysql2');
const fs = require('fs');

// Global connection that auto-revives + auto-timeouts
let connection;

// Create or revive connection
function getConnection() {
  return new Promise((resolve, reject) => {
    if (connection && connection.state === 'authenticated') {
      return resolve(connection);
    }

    // Kill any dead connection
    if (connection) {
      connection.destroy();
      connection = null;
    }

    console.log('Creating new MySQL connection...');

    connection = mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD_DEPLOY,
      database: process.env.MYSQL_DATABASE,
      ssl: {
        ca: fs.readFileSync(path.join(__dirname, '../ca.pem')),
        rejectUnauthorized: false
      }
    });

    connection.connect((err) => {
      if (err) {
        console.error('MySQL connection failed:', err.message);
        return reject(err);
      }
      console.log('MySQL connected (or reconnected)');
      resolve(connection);
    });
  });
}

// Your old db.query() works exactly the same — but now safe
function query(sql, params, callback) {
  // Support both: db.query(sql, callback) and db.query(sql, params, callback)
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  getConnection()
    .then(conn => {
      const queryTimeout = setTimeout(() => {
        console.warn('Query timed out after 25 seconds');
        callback(new Error('Database query timed out – please try again later'), null);
      }, 25000); // 25s = safe under Vercel's 300s limit

      conn.query(sql, params, (err, results, fields) => {
        clearTimeout(queryTimeout);

        if (err) {
          // Auto-reconnect on next query if connection died
          if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
            console.warn('Connection lost – will reconnect on next query');
            if (conn) conn.destroy();
            connection = null;
          }
          return callback(err, null, fields);
        }

        callback(null, results, fields);
      });
    })
    .catch(err => {
      callback(err, null);
    });
}

// Export exactly like your old file — no code changes needed anywhere
module.exports = { query };