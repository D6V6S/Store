//https://expressjs.com/ru/starter/generator.html
const { query } = require("express");

const express = require("express");
const app = express();
const port = 3000;

//http://expressjs.com/en/resources/middleware/cookie-parser.html
const cookieParser = require('cookie-parser')
const admin = require('./admin');

/*
public - папка с статикой
*/
app.use(express.static("public"));
/*
template
https://pugjs.org/api/getting-started.html
*/
app.set("view engine", "pug");

/*
connect SQL module
*/
const mysql = require("mysql");
const configDB = require("./config");

const con = mysql.createConnection(configDB);

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

/*
https://nodemailer.com/about/
*/
const nodemailer = require("nodemailer");

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

app.listen(port, function () {
  console.log("node express start on 3000");
});

//https://expressjs.com/ru/guide/using-middleware.html
app.use(function (req, res, next) {
  if (req.originalUrl == '/admin' || req.originalUrl == '/admin-order'){
    admin(req, res, con, next);
  } else {
    next();
  };
});

app.get("/", function (req, res) {
  let cat = new Promise(function (resolve, reject) {
    con.query(
      "SELECT id, slug, name, cost, image, category FROM (SELECT id,slug,name,cost,image,category, if(if(@curr_category != category, @curr_category := category, '') != '', @k := 0, @k := @k + 1) as ind FROM goods, ( SELECT @curr_category := '' ) v ) goods WHERE ind < 3",
      function (error, result, fields) {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });

  let catDescription = new Promise(function (resolve, reject) {
    con.query("SELECT * FROM category", function (error, result, fields) {
      if (error) return reject(error);
      resolve(result);
    });
  });

  Promise.all([cat, catDescription]).then(function (value) {
    // console.log(value[0]);
    res.render("main", {
      goods: JSON.parse(JSON.stringify(value[0])),
      cat: JSON.parse(JSON.stringify(value[1])),
    });
  });
});

app.get("/cat", function (req, res) {
  console.log(req.query);
  let catId = req.query.id;

  let cat = new Promise(function (resolve, reject) {
    con.query(
      "SELECT * FROM category WHERE id=" + catId,
      function (error, result) {
        if (error) reject(error);
        resolve(result);
      }
    );
  });
  let goods = new Promise(function (resolve, reject) {
    con.query(
      "SELECT * FROM goods WHERE category=" + catId,
      function (error, result) {
        if (error) reject(error);
        resolve(result);
      }
    );
  });

  Promise.all([cat, goods]).then(function (value) {
    // console.log(value[0]);
    res.render("cat", {
      cat: JSON.parse(JSON.stringify(value[0])),
      goods: JSON.parse(JSON.stringify(value[1])),
    });
  });
});

app.get("/goods/*", function (req, res) {
  con.query(
    `SELECT * FROM goods WHERE slug="${req.params['0']}" `,
    function (error, result) {
      if (error) throw error;
      res.render("goods", { goods: JSON.parse(JSON.stringify(result)) });
    }
  );
});

app.get("/order", function (req, res) {
  res.render("order");
});

app.post("/get-category-list", function (req, res) {
  con.query("SELECT id, category FROM category", function (error, result) {
    if (error) throw error;
    // console.log(result);
    res.json(result);
  });
});

app.post("/get-goods-info", function (req, res) {
  // console.log(req.body.key);
  if (req.body.key.length != 0) {
    let queryDB = `SELECT id,name,cost FROM goods WHERE id IN (${req.body.key.join(',')})`;
    con.query(queryDB, function (error, result) {
      if (error) throw error;
      // console.log(result);
      let goods = {};
      for (const element of result) {
        goods[element["id"]] = element;
      }
      res.json(goods);
    });
  } else {
    res.send("0");
  }
});

app.post("/finish-order", function (req, res) {
  // console.log(req.body);
  if (req.body.key.length != 0) {
    let key = Object.keys(req.body.key);
    let queryDB = `SELECT id,name,cost FROM goods WHERE id IN (${key.join(',')})`;
    con.query(queryDB, function (error, result) {
      if (error) throw error;
        // console.log(result);
        sendMail(req.body, result).catch(console.error);
        saveOrder(req.body, result);
        res.send("1");
    });
  } else {
    res.send("0");
  }
});

app.get("/admin", function (req, res) {
  res.render('admin', {});
});

app.get("/admin-order", function (req, res) {
      con.query(`SELECT 
      shop_order.id as id,
      shop_order.user_id as user_id,
      shop_order.goods_id as goods_id,
      shop_order.goods_cost as goods_cost,
      shop_order.goods_amount as goods_amount,
      shop_order.total as total,
      from_unixtime(date,"%Y-%m-%d %h:%m") as human_date,
      user_info.user_name as user,
      user_info.user_phone as phone,
      user_info.address as address
    FROM 
      shop_order
    LEFT JOIN	
      user_info
    ON shop_order.user_id = user_info.id ORDER BY id DESC`,
      function (error, result) {
        if (error) throw error;
        res.render("admin-order", { order: JSON.parse(JSON.stringify(result)) });
      }
    );
});

app.get("/admin-goods", function (req, res) {
  res.render("admin-goods", {});
});

app.get("/login", function (req, res) {
  res.render("login", {});
});

app.post("/login", function (req, res) {
  // console.log(req.body);
  // console.log(req.body.login);
  // console.log(req.body.password);
  con.query(
    `SELECT * FROM user WHERE user='${req.body.login}' AND password='${req.body.password}'`,
    function (error, result) {
      if (error) reject(error);
      if (result.length == 0) {
        console.log('ERROR User not found');
        res.redirect('/login');
      } else {
        result = JSON.parse(JSON.stringify(result));
        let hash = makeHash(32);
        res.cookie('hash', hash);
        res.cookie('id', result[0]['id']);

        con.query(`UPDATE user SET hash='${hash}' WHERE id = ${result[0]['id']}`, function (error, result) {
          if (error) throw error;
          res.redirect('/admin');
        });
      }
    }
  );
});



function saveOrder(data, result) {
  let sql;
  sql = "INSERT INTO user_info (user_name, user_phone, user_email,address) VALUES ('" + data.username + "', '" + data.phone + "', '" + data.email + "','" + data.address + "')";
  con.query(sql, function (error, resultQuery) {
    if (error) throw error;
    console.log("1 user record inserted");
    let userId = resultQuery.insertId;
    date = new Date() / 1000;
    for (let i = 0; i < result.length; i++) {
      sql = "INSERT INTO shop_order (date, user_id, goods_id, goods_cost, goods_amount, total) VALUES (" + date + ","+ userId+"," + result[i]['id'] + ", " + result[i]['cost'] + "," + data.key[result[i]['id']] + ", " + data.key[result[i]['id']] * result[i]['cost'] + ")";
      // console.log(sql);
      con.query(sql, function (error, resultQuery) {
        if (error) throw error;
        console.log("1 record inserted");
      });
    }
  });
}

async function sendMail(data, result){
  let res = "<h2>Order in Lihe Shop</h2>";
  let total = 0;
  for(const element of result){
    res += `<p>${element['name']} - ${data.key[element['id']]} - ${element['cost'] * data.key[element['id']]} uah</p>`;
    total += element['cost']*data.key[element['id']];
  }
  // console.log(res);
  res +='<hr>';
  res +=`Total ${total} uah`;
  res +=`<hr>Phone: ${data.phone}`;
  res +=`<hr>Username: ${data.username}`;
  res +=`<hr>Adress: ${data.address}`;
  res +=`<hr>Email: ${data.email}`;
  

  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  // send mail with defined transport object
  let mailOptions = {
    from: '"Lite Shop" <vitya.demichev@gmail.com>', // sender address
    to: "bar@example.com, vitya.demichev@gmail.com", // list of receivers
    subject: "Lite Shop", // Subject line
    text: "Hello world?", // plain text body
    html: res, // html body
  };

  let info = await transporter.sendMail(mailOptions);

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  return true;
}

function makeHash(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}