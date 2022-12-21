//https://expressjs.com/ru/starter/generator.html
const { query } = require('express');

const express = require('express');
const app = express();
const port = 3000;

/*
public - папка с статикой
*/
app.use(express.static('public'));
/*
template
https://pugjs.org/api/getting-started.html
*/
app.set('view engine', 'pug');

/*
connect SQL module
*/
const mysql = require('mysql');
const configDB = require('./config');

const con = mysql.createConnection(configDB);


app.listen(port, function () {
    console.log('node express start on 3000');
});

app.get('/', function (req, res) {

    const query = "SELECT * FROM goods";
    
    con.query(query, function (error, result) {
        if (error) throw err;
        let goods = {};
        for (const element of result){
            goods[element['id']] = element;
        };
        
        res.render('main', {
            foo: 4,
            bar: 7,
            goods: JSON.parse(JSON.stringify(goods))
        });
    });
});

app.get('/cat', function (req, res) {
    console.log(req.query.id);
    let catId = req.query.id;
  
    let cat = new Promise(function (resolve, reject) {
      con.query(
        'SELECT * FROM category WHERE id=' + catId,
        function (error, result) {
          if (error) reject(error);
          resolve(result);
        });
    });
    let goods = new Promise(function (resolve, reject) {
      con.query(
        'SELECT * FROM goods WHERE category=' + catId,
        function (error, result) {
          if (error) reject(error);
          resolve(result);
        });
    });
  
    Promise.all([cat, goods]).then(function (value) {
      console.log(value[0]);
      res.render('cat', {
        cat: JSON.parse(JSON.stringify(value[0])),
        goods: JSON.parse(JSON.stringify(value[1]))
      });
    })
  });

app.get('/goods', function (req, res) {
    console.log(req.query.id);
    con.query(
        'SELECT * FROM goods WHERE id=' + req.query.id,
        function (error, result) {
          if (error) throw error;
          res.render('goods', {goods: JSON.parse(JSON.stringify(result))});
        });
});

app.post('/get-category-list',function (req, res){
  // console.log(req)
  con.query(
    'SELECT id, category FROM category',
    function (error, result) {
      if (error) throw error;
      console.log(result);
      res.json(result);
    });
});