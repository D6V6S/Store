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

