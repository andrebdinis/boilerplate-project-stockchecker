'use strict';

// import mongodb connection and mongoose models and functions
const db = require('./connection.js')

// import ip-stock-liking-system
const ip_stock_liking_system = require('./ip-stock-liking-system.js')


module.exports = function (app) {

  // Root Logger
  /*app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} ${req.ip}`)
    next()
  })*/

  app.route('/api/stock-prices')
    .get(function (req, res){
      
      // Allow IP addresses to "like" stocks and count how many "likes" a stock has
      // If a valid stock symbol is provided, returns its current stock price
      // If two stock symbols is provided, returns the relative difference in "likes"
      ip_stock_liking_system.main(req, res, db)

    });  
};
