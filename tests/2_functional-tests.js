const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

const { findIpHashInDB } = require('../routes/connection.js')

// Calculate 'likes' relative difference between two stocks
const { getLikesRelativeDifference } = require('../routes/ip-stock-liking-system.js')

// Find IP address
//const iplib = require('ip')
//var ip = iplib.address() //172.18.0.54
//var localhost_ip = "127.0.0.1"

suite('Functional Tests', function() {

  // gives 10 seconds to finish all tests
  this.timeout(10000)
  const apiStockPricesPath = '/api/stock-prices'

  suite('Five GET requests to ' + apiStockPricesPath, function() {

    //#1 Viewing one stock
    let beforeLiking_likesGOOG;
    test('Viewing one stock', function(done) {

      //BEFORE begin testing, make sure request ip does not exist in db
      const preTesting = "PRE-TESTING"
      console.log(`$${preTesting}: Verifying if request ip is not in db...$`)
      chai.request(server).get("/").end(function(err, res) {
        const ip = res.req.host; //"127.0.0.1" (localhost ip)
        findIpHashInDB(ip)
          .then(function(result) {
            if(!result.hash) {
              console.log(`$${preTesting}: Hash of request ip NOT found in db$\n$TESTING CAN BEGIN$\n`)
            }
            else {
              console.log(`$${preTesting}: Hash of request ip FOUND in db. Removing document...$`)
              result.doc.remove()
                .then(function(doc) { console.log(`$${preTesting}: Document successfully removed from db$\n$TESTING CAN BEGIN$\n`) })
                .catch(function(err) { console.error(err); done() })
            }
          })
          //AFTER making sure the request ip document is not in db, tests can begin!
          .then(function(data) {
            
            //BEGIN first test
            const stock = "stock=GOOG"
            const getRequestPath = apiStockPricesPath + "?" + stock
            
            chai
              .request(server)
              .get(getRequestPath)
              .end(function(err, res) {
                if(err) return console.error(err)
                //OUTPUT:{"stockData":{"stock":"GOOG","price":98.3,"likes":0}}
                assert.equal(res.status, 200)
                assert.equal(res.type, 'application/json')
                assert.property(res.body, 'stockData')
                assert.property(res.body.stockData, 'stock')
                assert.property(res.body.stockData, 'price')
                assert.property(res.body.stockData, 'likes')
                assert.equal(res.body.stockData.stock, 'GOOG')
                beforeLiking_likesGOOG = res.body.stockData.likes
                done()
              })
          })
          .catch(function(err) {
            console.error(err)
            done()
          })
      })
    })

    //#2 Viewing one stock and liking it
    let afterLiking_likesGOOG;
    test('Viewing one stock and liking it', function(done) {
      const stock = 'stock=GOOG'
      const like = 'like=true'
      const getRequestPath = apiStockPricesPath + "?" + stock
      const getRequestPathWithLike = apiStockPricesPath + "?" + stock + "&" + like
      
      //get number of stock "likes" before liking it
      //beforeLiking_likesGOOG (already obtained from the previous test)
      /*chai
        .request(server)
        .get(getRequestPath)
        .end(function(err, res) {
          //OUTPUT:{"stockData":{"stock":"GOOG","price":98.3,"likes":0}}
          assert.equal(res.status, 200)
          assert.equal(res.type, 'application/json')
          beforeLikes = res.body.stockData.likes
      })*/
      

      //"like" the stock and get the updated number of stock "likes"
      chai
        .request(server)
        .get(getRequestPathWithLike)
        .end(function(err, res) {
          //OUTPUT:{"stockData":{"stock":"GOOG","price":98.3,"likes":1}}
          assert.equal(res.status, 200)
          assert.equal(res.type, 'application/json')

          //check if liked stock really has one more "like" than before
          afterLiking_likesGOOG = beforeLiking_likesGOOG + 1
          chai
            .request(server)
            .get(getRequestPath)
            .end(function(err, res) {
              assert.equal(res.status, 200)
              assert.equal(res.type, 'application/json')
              assert.equal(res.body.stockData.likes, afterLiking_likesGOOG)
              done()
            })
        })
        //})
    })

    //#3 Viewing the same stock and liking it again
    let sameLikesGOOG;
    test('Viewing the same stock and liking it again', function(done) {
      const stock = 'stock=GOOG'
      const like = 'like=true'
      const getRequestPath = apiStockPricesPath + "?" + stock
      const getRequestPathWithLike = apiStockPricesPath + "?" + stock + "&" + like

      //get total number of stock "likes" before trying to like the stock again
      sameLikesGOOG = afterLiking_likesGOOG
      /*chai
        .request(server)
        .get(getRequestPath)
        .end(function(err, res) {
          //OUTPUT:{"stockData":{"stock":"GOOG","price":98.3,"likes":1}}
          assert.equal(res.status, 200)
          assert.equal(res.type, 'application/json')
          const beforeLikes = res.body.stockData.likes*/

          //try to "like" the stock once again and check if the already liked stock has the same number of "likes" as before
          chai
            .request(server)
            .get(getRequestPathWithLike)
            .end(function(err, res) {
              //OUTPUT:{"stockData":{"stock":"GOOG","price":98.3,"likes":1}}
              assert.equal(res.status, 200)
              assert.equal(res.type, 'application/json')
              assert.equal(res.body.stockData.likes, sameLikesGOOG)              
              done()
            })
        //})
    })

    //#4 Viewing two stocks
    test('Viewing two stocks', function(done) {
      const stock1_n = 'GOOG', stock2_n = 'MSFT';
      const stock1 = "stock=" + stock1_n
      const stock2 = "stock=" + stock2_n
      const getRequestPathStock1 = apiStockPricesPath + "?" + stock1
      const getRequestPathStock2 = apiStockPricesPath + "?" + stock2
      const getRequestPath = apiStockPricesPath + "?" + stock1 + "&" + stock2

      //get "likes" of first stock
      chai
        .request(server)
        .get(getRequestPathStock1)
        .end(function(err, res) {
          //OUTPUT:{"stockData":{"stock":"GOOG","price":98.3,"likes":1}}
          assert.equal(res.status, 200)
          assert.equal(res.type, 'application/json')
          const beforeLikes1 = res.body.stockData.likes

          //get "likes" of second stock
          chai
            .request(server)
            .get(getRequestPathStock2)
            .end(function(err, res) {
              //OUTPUT:{"stockData":{"stock":"TSLA","price":221.72,"likes":0}}
              assert.equal(res.status, 200)
              assert.equal(res.type, 'application/json')
              const beforeLikes2 = res.body.stockData.likes

              //calculate 'likes' relativ difference between both stocks
              const [rel_likes1, rel_likes2] = getLikesRelativeDifference(beforeLikes1, beforeLikes2)

              //view both stocks and compare if each 'rel_likes' ('likes' relative difference) match
              chai
                .request(server)
                .get(getRequestPath)
                .end(function(err, res) {
                  //OUTPUT EXAMPLE:{"stockData":[{"stock":"GOOG","price":98.3,"rel_likes":1},{"stock":"TSLA","price":221.72,"rel_likes":-1}]}
                  assert.equal(res.status, 200)
                  assert.equal(res.type, 'application/json')
                  assert.property(res.body, 'stockData')
                  assert(Array.isArray(res.body.stockData), 'checks if stockData is an array')
                  let arrayHasStock1 = res.body.stockData.some(d => d.stock == stock1_n)
                  let arrayHasStock2 = res.body.stockData.some(d => d.stock == stock2_n)
                  assert.isTrue(arrayHasStock1, 'checks if stockData has an object with the stock ' + stock1_n)
                  assert.isTrue(arrayHasStock2, 'checks if stockData has an object with the stock ' + stock2_n)
                  
                  if(Array.isArray(res.body.stockData)) {
                    for(let i=0; i < res.body.stockData.length; i++){
                      let relLikesMatch = (res.body.stockData[i].rel_likes == rel_likes1 || res.body.stockData[i].rel_likes == rel_likes2)
                      assert.isTrue(relLikesMatch, 'checks if "rel_likes" value of each object matches with at least one of the calculated "rel_likes" values')
                    }
                  }
                  done()
                })
            })
        })     
    })

    //#5 Viewing two stocks and liking them
    test('Viewing two stocks and liking them', function(done) {
      //this.timeout(5000)
      const stock1_n = 'AAPL', stock2_n = 'TSLA';
      const stock1 = "stock=" + stock1_n
      const stock2 = "stock=" + stock2_n
      const like = 'like=true'
      const getRequestPathStock1 = apiStockPricesPath + "?" + stock1
      const getRequestPathStock2 = apiStockPricesPath + "?" + stock2
      const getRequestPathWithLike = apiStockPricesPath + "?" + stock1 + "&" + stock2 + "&" + like

      let beforeLikes1, beforeLikes2;

      //get "likes" of first stock
      chai
        .request(server)
        .get(getRequestPathStock1)
        .end(function(err, res) {
          assert.equal(res.status, 200)
          assert.equal(res.type, 'application/json')
          beforeLikes1 = res.body.stockData.likes

          //get "likes" of second stock
          chai
            .request(server)
            .get(getRequestPathStock2)
            .end(function(err, res) {
              assert.equal(res.status, 200)
              assert.equal(res.type, 'application/json')
              beforeLikes2 = res.body.stockData.likes

              //"like" both stocks
              chai
              .request(server)
              .get(getRequestPathWithLike)
              .end(function(err, res) {
                assert.equal(res.status, 200)
                assert.equal(res.type, 'application/json')
                
                //get "likes" of first stock (again)
                  chai
                  .request(server)
                  .get(getRequestPathStock1)
                  .end(function(err, res) {
                    assert.equal(res.status, 200)
                    assert.equal(res.type, 'application/json')
                    const afterLikes1 = res.body.stockData.likes
          
                    //get "likes" of second stock (again)
                    chai
                    .request(server)
                    .get(getRequestPathStock2)
                    .end(function(err, res) {
                      assert.equal(res.status, 200)
                      assert.equal(res.type, 'application/json')
                      const afterLikes2 = res.body.stockData.likes
          
                      //compare beforeLikes and afterLikes
                      assert.isAbove(afterLikes1, beforeLikes1, 'stock 1 "likes" must have one more "like" than before')
                      assert.isAbove(afterLikes2, beforeLikes2, 'stock 2 "likes" must have one more "like" than before')
                      done()
                    })
                  })
              })
            })
        })
    })
  })
});
