// import database key and mongoose library
const DB = process.env.DB
let mongoose = require('mongoose')

// Connect to MongoDB (Database name: "stockPriceCheckerIpDB")
mongoose.connect(DB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to database') )
  .catch((err) => console.error('Could not connect to mongo DB', err) );

// import bcrypt library
const bcrypt = require('bcrypt')
const saltRounds = 10

// waiting time function
// (applied immediately after running "ipAnonymizationSavePromise" and before "addLikedStockToIpPromise")
const waiting_time_in_ms = 250 //PASSED ALL TESTS WITH 250ms
const delay = (milliseconds) => new Promise(resolve => setTimeout(()=>{
  console.log("DELAYED FOR " + waiting_time_in_ms + "ms")
  resolve()
}, milliseconds))


// PRINT FUNCTIONS
function printDoesNotExistInDB(model_type, value) {
  console.log(`${value} ${model_type} does not exist in DB`)
}
function printExistsInDB(model_type, value) {
  console.log(`${model_type} ${value} already exists in DB`)
}
function printSuccessfullySavedInDB(model_type, value) {
  console.log(`${value} ${model_type} successfully saved in DB`)
}
function printSuccessfullyIncrementedInDB(model_type, value) {
  console.log(`${value} ${model_type} successfully incremented in DB`)
}
function printIpAlreadyLikedThisStock(ip_address, likedStock_symbol) {
  console.log(`${ip_address} ip already liked stock ${likedStock_symbol}`)
}
function printIpLikedStockSuccessfully(ip_address, likedStock_symbol) {
  console.log(`${ip_address} ip liked stock ${likedStock_symbol}`)
}

// Stock Schema
const stockSchema = new mongoose.Schema({
  stock: {
    type: String,
    required: [true, 'Stock symbol is required'],
    uppercase: true,
    unique: true
  },
  likes: {
    type: Number,
    default: 0
  }
})
// Stock Model Instance
const StockModel = mongoose.model('Stock', stockSchema, 'stockCollection')

/*
const deleteAllStocksFromDB = async () => {
  //await StockModel.deleteMany({})
  StockModel.deleteMany({}, function(err, deleteCount) {
    return console.log("All stocks were deleted from db")
  })
}

// Find One Or Create And Save Stock
const findOneOrCreateStock = function(stock, done) {
  const stock_symbol = stock.toUpperCase()
  StockModel.findOne({ stock: stock_symbol }, (err, data) => {
    if (err) return console.error(err);
    if (!data) {
      // If stock does not exist, create one
      printDoesNotExistInDB("stock", stock_symbol)
      const StockOne = new StockModel({ stock: stock_symbol, likes: 0 })
      StockOne.save(function(err, data) {
        if(err) return console.error(err)
        printSuccessfullySavedInDB("stock", stock_symbol)
        return data;
      })
    }
    else {
      // Stock already exists
      //printExistsInDB("stock", stock_symbol)
      return data
    }
  });
}
*/

// Increment a Like To Stock
const incrementLikeToStock = async function(likedStock, done) {
  const likedStock_symbol = likedStock.toUpperCase()
  StockModel
    .findOne({ stock: likedStock_symbol }, (err, data) => {
      if (err) return console.error(err);
      if (!data) {
        // If stock does not exist, create one
        printDoesNotExistInDB("stock", likedStock_symbol)
        const StockOne = new StockModel({ stock: likedStock_symbol, likes: 1 })
        StockOne.save(function(err, data) {
          if(err) return console.error(err)
          printSuccessfullySavedInDB("stock", likedStock_symbol)
          return data;
        })
      }
      else {
        // If stock already exists, just increment likes by 1
        //printExistsInDB("stock", likedStock_symbol)
        data.likes += 1
        data.save((err, data) => {
          if (err) return console.error(err);
          printSuccessfullyIncrementedInDB("stock", likedStock_symbol)
          return data;
        });
      }
    });
}





// Ip Schema
const ipSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    unique: true
  },
  likedStocks: {
    type: [String],
    default: []
  }
})
// Ip Model Instance
const IpModel = mongoose.model('Ip', ipSchema, 'ipCollection')

/*
const deleteAllIpsFromDB = async () => {
  //await IpModel.deleteMany({})
  IpModel.deleteMany({}, function(err, deleteCount) {
    return console.log("All ips were deleted from db")
  })
}

// Find One Or Create Ip
const findOneOrCreateIp = function(ip_address, done) {
  IpModel.findOne({ ip: ip_address }, (err, data) => {
    if (err) return console.error(err);
    if (!data) {
      // If Ip does not exist, create one
      printDoesNotExistInDB("ip", ip_address)

      const IpOne = new IpModel({ ip: ip_address })      
      IpOne.save(function(err, data) {
        if(err) return console.error(err)
        printSuccessfullySavedInDB("ip", ip_address)
        return data;
      })
    }
    else {
      // Ip exists in DB
      //printExistsInDB("ip", ip_address)
      return data;
    }
  })
}
*/

// Add Liked Stock To Ip & Increment Stock "likes" by 1
// (create Ip if inexistent, create Stock if inexistent, and update them both)
const addLikedStockToIp = async (ip_address, likedStock, done) => {
  const likedStock_symbol = likedStock.toUpperCase()

  // checks if hashed version of ip is in db
  const resultPromise = findIpHashInDB(ip_address)
  const result = await resultPromise
  
  if(!result.hash) {
    // ip hash not found in db
    // If Ip does not exist, create one (and save hash in db instead of the ip)
    printDoesNotExistInDB("ip", "NOT ANONYMIZED")
    
    // create anonymized ip and save in db
    const ipAnonymizationSavePromise = createAnonymizedIpAndSaveToDB(ip_address)
    let data = await ipAnonymizationSavePromise

    // wait some time
    await delay(waiting_time_in_ms)
    
    // AND NOW that the ip hash exists in the database,
    // a recursive call is made to add 1 "like" to the liked stock
    const addLikedStockToIpPromise = addLikedStockToIp(ip_address, likedStock_symbol)
    data = await addLikedStockToIpPromise
    
    return data
  }
  else {
    // Ip already exists in DB
    //printExistsInDB("ip", ip_address)
    // NOW check if already has the liked stock symbol
    if(result.doc.likedStocks.indexOf(likedStock_symbol) !== -1) {
      // already has the liked stock symbol
      printIpAlreadyLikedThisStock(sliceHash(result.hash), likedStock_symbol)
      return result.doc
    }
    else {
      // it does not have the liked stock symbol
      // add liked stock symbol to Ip
      result.doc.likedStocks.push(likedStock_symbol)
      result.doc.save((err, data) => {
        if (err) return console.error(err);
        printIpLikedStockSuccessfully(sliceHash(result.hash), likedStock_symbol)
        
        // AND NOW increment a like by 1 to the stock
        incrementLikeToStock(likedStock_symbol)
          .then(function(stock) { return data })
          .catch(function(err) { return console.error(err) })
      });
    }
  }
};


//------------------------------------------------------------------
// BCRYPT FUNCTIONS

function sliceHash(hash) {
  return hash.slice(hash.length-31, hash.length)
}

//------------------------------------------------------------------
// BCRYPT ASYNC FUNCTIONS

// iterate over all IpModel documents in the database, one by one,
// searching for a match between the ip_address and the hash stored in db
const findIpHashInDB = async (ip_address) => {
  for await (const doc of IpModel.find()) {
    const hash_in_DB = doc.ip
    const matchPromise = bcrypt.compare(ip_address, hash_in_DB);
    const match = await matchPromise
    if(match){
      return { doc: doc, hash: hash_in_DB }
    }
  }
  return false
}

// create anonymized ip and save in database
const createAnonymizedIpAndSaveToDB = async (ip_address) => {
  // ANONYMIZE IP ADDRESS BEFORE SAVING TO DB (hash it)
  bcrypt.genSalt(saltRounds, function(err, salt) {
    bcrypt.hash(ip_address, salt, function(err, hash) {
      // Store hash in your password DB.
      const IpOne = new IpModel({ ip: hash, likedStocks: []})
      IpOne.save(function(err, data) {
        if(err) return console.error(err)
        printSuccessfullySavedInDB("ip", sliceHash(hash))
        return data
      })
    });
  });
}


//------------------------------------------------------------------


module.exports = {
  waiting_time_in_ms,
  printDoesNotExistInDB,
  //printExistsInDB,
  printSuccessfullySavedInDB,
  printSuccessfullyIncrementedInDB,
  printIpAlreadyLikedThisStock,
  printIpLikedStockSuccessfully,
  stockSchema,
  StockModel,
  //deleteAllStocksFromDB,
  //findOneOrCreateStock,
  incrementLikeToStock,
  ipSchema,
  IpModel,
  //deleteAllIpsFromDB,
  //findOneOrCreateIp,
  addLikedStockToIp,
  findIpHashInDB
}

// export { function1, function2 }
  