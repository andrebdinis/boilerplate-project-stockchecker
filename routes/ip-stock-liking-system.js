// PROXY URL:
/*//https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
//EXAMPLE: https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/GOOG/quote
//FIELDS: {"symbol":"GOOG", "latestPrice":98.8}*/

// import "request" lib to request stock prices from proxy url
var request = require('request');

// import "util" lib to turn "request" function into a promise (promisify)
// (as to avoid "callback hell")
const util = require('node:util');
const requestPromise = util.promisify(request)


function main (req, res, db) {

  const [ip, query, stock, like] = getIpAndQueryInputFromReq(req)
  /* ip = 172.18.0.1
  // query = { stock: [ 'GOOG', 'MSFT' ], like: 'true' }
  // stock = undefined or 'GOOG' or [ 'GOOG', 'MSFT' ]
  // like = undefined or 'true' or 'false'*/

  // is "stock" a req.query property ?
  if(query.hasOwnProperty("stock")){
    
    // is stock an array (two values)?
    if(Array.isArray(stock)){
      // stock is array (two values)
      const url1 = getProxyUrlRight(stock[0])
      const url2 = getProxyUrlRight(stock[1])
  
      // WELCOME TO THE TWO STOCKS ASYNC WORLD!
      const welcomeToTheTwoStocksAsyncWorld = async () => {

        // get both stock prices
        let promise1 = readRequestCreateStockObjectAsyncFunc(url1)//.catch((error) => { console.error(error) })
        let promise2 = readRequestCreateStockObjectAsyncFunc(url2)//.catch((error) => { console.error(error) })
        // retrieve "likes" from both stocks in db
        let promise3 = getStockLikesAsyncFunc(stock[0], db)
        let promise4 = getStockLikesAsyncFunc(stock[1], db)
        // fulfill all 4 promises at the same time
        const [stock_obj1, stock_obj2, likes1, likes2] = await Promise.all([promise1, promise2, promise3, promise4]).catch(function(err) { console.error(err) })

        // calculate "likes" relative difference between stocks
        const [rel_likes1, rel_likes2] = getLikesRelativeDifference(likes1, likes2)

        // build both stock_objects with "rel_like" property
        const stock1 = Object.assign({}, stock_obj1, {rel_likes:rel_likes1})
        const stock2 = Object.assign({}, stock_obj2, {rel_likes:rel_likes2})
        const stock_relativ_diff_arr = [ stock1, stock2 ]

        // if an Ip likes both stocks, then add both to ip and increment their likes
        if(like=="true"){
          // add both liked stocks (one at a time)
          promise1 = addLikedStockToIpAndIncrementStockLikesAsyncFunc(stock[0], ip, db)
          promise2 = addLikedStockToIpAndIncrementStockLikesAsyncFunc(stock[1], ip, db)
          const [data1, data2] = await Promise.all([promise1, promise2])
        }

        // return relative difference between both stocks
        const json_obj = {
          stockData: stock_relativ_diff_arr
        }
        return respondJsonObject(res, json_obj)
      }

      // call async function for two stocks
      welcomeToTheTwoStocksAsyncWorld()
        .then(function(response) { return response })
        .catch(function(err) { return console.error(err) })
    }
    else {
      // stock is string (one value)
      
      // get correct proxy url format
      const url = getProxyUrlRight(stock)

      // request stock price from correct proxy url format
      request(url, (error, response, body) => {
        if(error) res.send(error)
        
        let stock_obj = getStockObjectFromRequestedBody(body)
        
        // RETRIEVE FROM DB HOW MANY LIKES THE STOCK SYMBOL HAS!
        db.StockModel.findOne({ stock: stock }, (err, data) => {
          if (err) return console.error(err);
          if (!data) {
            // If stock does not exist, create one
            db.printDoesNotExistInDB("stock", stock)
            const StockOne = new db.StockModel({ stock: stock, likes: 0 })
            StockOne.save(function(err, data) {
              if(err) return console.error(err)
              db.printSuccessfullySavedInDB("stock", stock)
              respondWhetherLikeIsTrueOrNot(like, ip, stock, stock_obj, db, res)
                .then(function(data2) { return data2 })
                .catch(function(err) { return console.error(err) })
            });
          }
          else {
            // Stock already exists
            //db.printExistsInDB("Stock", stock)
            respondWhetherLikeIsTrueOrNot(like, ip, stock, stock_obj, db, res)
              .then(function(data) { return data })
              .catch(function(err) { return console.error(err) })
          }
        });
      });
    }
  }
  else {
    error_msg = 'Error: req.query does not have a property named \'stock\''
    console.error(error_msg)
    res.send(error_msg)
  }
  
}


//---------------------------------------------------------
// TWO STOCKS ASYNC FUNCTIONS

// get both stock prices
const readRequestCreateStockObjectAsyncFunc = async (url) => {  
  let body = await requestPromise(url) // * "requestPromise(...) is the "request" function (from "request" library) turned into a promise (was promisified) - for more info see code on top
  let stock_obj = getStockObjectFromRequestedBody(body.body)
  return stock_obj
}

// retrieve "likes" from both stocks in db
const getStockLikesAsyncFunc = async (stock_symbol, db) => {
  // try to get stock
  const findStockPromise = db.StockModel.findOne({stock:stock_symbol}, 'stock likes').exec()
  let doc = await findStockPromise
  // if stock does not exist, create one
  if(!doc) {
    const createAndSaveStockPromise = new db.StockModel({stock:stock_symbol,likes:0}).save()
    doc = await createAndSaveStockPromise
  }
  return doc.likes
}

// Add Liked Stock To Ip and Increment Stock "likes"
const addLikedStockToIpAndIncrementStockLikesAsyncFunc = async (stock_symbol, ip_address, db) => {
  // add liked stock to ip, and consequently increment stock "likes"
  const updateIpAndIncrementStockPromise = db.addLikedStockToIp(ip_address, stock_symbol)
  let data = await updateIpAndIncrementStockPromise
  return data
}

//---------------------------------------------------------
// ONE STOCK ASYNC FUNCTIONS:

// whether like='true' or 'false', find that stock in db and respond w/ json object
// (with updated 'likes' value)
const findOneStockAndRespondJsonObject = async (stock, stock_obj, db, res) => {
  db.StockModel.findOne({stock: stock}, (err, data) => {
    if(err) return console.error(err)
    const json_obj = {
      stockData: Object.assign({}, stock_obj, {likes: data.likes})
    }
    return respondJsonObject(res, json_obj)
  })
}

// like = 'true'
const likeIsTrueAsyncFunc = async (ip, stock, stock_obj, db, res) => {
  const updateIpAndIncrementStockPromise = db.addLikedStockToIp(ip, stock)
  const data1 = await updateIpAndIncrementStockPromise

  const findStockAndRespondPromise = findOneStockAndRespondJsonObject(stock, stock_obj, db, res)
  const data2 = await findStockAndRespondPromise
  
  return data2
}

// like = 'false'
const likeIsFalseAsyncFunc = async (stock, stock_obj, db, res) => {
  const findStockAndRespondPromise = findOneStockAndRespondJsonObject(stock, stock_obj, db, res)
  const data = await findStockAndRespondPromise
  return data
}

// verify if like='true' or 'false'
const respondWhetherLikeIsTrueOrNot = async (like, ip, stock, stock_obj, db, res) => {
  let data;
  if(like === "true") {
    const likeIsTruePromise = likeIsTrueAsyncFunc(ip, stock, stock_obj, db, res)
    data = await likeIsTruePromise
  }
  else {
    const likeIsFalsePromise = likeIsFalseAsyncFunc(stock, stock_obj, db, res)
    data = await likeIsFalsePromise
  }
  return data
}

//---------------------------------------------------------
// OTHER AUXILIARY FUNCTIONS

function getIpAndQueryInputFromReq(req){
  const ip = getIpAddressRight(req.ip)
  const query = JSON.parse(JSON.stringify(req.query))
  const stock = query.stock
  const like = query.like
  return [ip, query, stock, like]
}
function getIpAddressRight(ip){
  return ip.slice(ip.lastIndexOf(":")+1, ip.length)
}
function getProxyUrlRight(stock_symbol){
  // https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/[symbol]/quote
  return "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/" + stock_symbol + "/quote";
}
function getStockObjectFromRequestedBody(body) {
  const json = JSON.parse(body)
  const stock = json.symbol
  const price = parseFloat(json.latestPrice) //.toFixed(2)
  // if the value of symbol (stock) or latestPrice (price) is undefined, none interest
  let stock_obj = { stock: stock, price: price }
  if (!stock_obj.stock || !stock_obj.price) { stock_obj = {} }
  return stock_obj
}
function getLikesRelativeDifference(stock1_likes, stock2_likes){
  let rel_likes, rel_likes1, rel_likes2;
  if (stock1_likes === stock2_likes) { rel_likes = rel_likes1 = rel_likes2 = 0 }
  else if (stock1_likes > stock2_likes) {
    rel_likes = (stock1_likes - stock2_likes)
    rel_likes1 = rel_likes
    rel_likes2 = -(rel_likes)
  }
  else {
    rel_likes = (stock2_likes - stock1_likes)
    rel_likes1 = -(rel_likes)
    rel_likes2 = rel_likes
  }
  return [rel_likes1, rel_likes2]
}
function respondJsonObject(res, json_obj){
  console.log(json_obj)
  return res.json(json_obj)
}


//---------------------------------------------------------
//ONE-STOCK OUTPUT EXAMPLES:
//{"stockData":{"error":"external source error","likes":1}}
//{"stockData":{"likes":13}}
//{"stockData":{"stock":"GOOG","price":98.8,"likes":1108}}

//TWO-STOCKS OUTPUT EXAMPLE:
//{"stockData":[{"stock":"MSFT","price":62.30,"rel_likes":-1},{"stock":"GOOG","price":786.90,"rel_likes":1}]}  

// CASE-USES:
/*// GET SINGLE PRICE AND TOTAL LIKES
  // CASE 01:
      // /api/stock-prices?stock=GOOG
      // {"stockData":{"stock":"GOOG","price":98.8,"likes":1108}}
  // CASE 02:
      // /api/stock-prices?stock=GOOG&like=true  

  // COMPARE AND GET RELATIVE LIKES
  // CASE 03:
      // /api/stock-prices?stock=GOOG&stock=MSFT
      // {"stockData":[{"stock":"MSFT","price":62.30,"rel_likes":-1},{"stock":"GOOG","price":786.90,"rel_likes":1}]}
  // CASE 04
      // /api/stock-prices?stock=GOOG&stock=MSFT&like=true*/



module.exports = {
  main,
  getLikesRelativeDifference
}