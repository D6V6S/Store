//https://expressjs.com/ru/starter/generator.html
const { query } = require("express");

const express = require("express");
const app = express();
const port = 3000;

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

/*
https://nodemailer.com/about/
*/
const nodemailer = require("nodemailer");

app.listen(port, function () {
  console.log("node express start on 3000");
});

app.get("/", function (req, res) {
  let cat = new Promise(function (resolve, reject) {
    con.query(
      "SELECT id,name, cost, image, category FROM (SELECT id,name,cost,image,category, if(if(@curr_category != category, @curr_category := category, '') != '', @k := 0, @k := @k + 1) as ind FROM goods, ( SELECT @curr_category := '' ) v ) goods WHERE ind < 3",
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
  // console.log(req.query.id);
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

app.get("/goods", function (req, res) {
  // console.log(req.query.id);
  con.query(
    "SELECT * FROM goods WHERE id=" + req.query.id,
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
    console.log(result);
    res.json(result);
  });
});

app.post("/get-goods-info", function (req, res) {
  // console.log(req.body.key);
  if (req.body.key.length != 0) {
    let queryDB = `SELECT id,name,cost FROM goods WHERE id IN (${req.body.key.join(',')})`;
    con.query(queryDB, function (error, result) {
      if (error) throw error;
      console.log(result);
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
  console.log(req.body);
  if (req.body.key.length != 0) {
    let key = Object.keys(req.body.key);
    let queryDB = `SELECT id,name,cost FROM goods WHERE id IN (${key.join(',')})`;
    con.query(queryDB, function (error, result) {
      if (error) throw error;
        console.log(result);
        sendMail(req.body, result).catch(console.error);
        res.send("1");
    });
  } else {
    res.send("0");
  }
});


async function sendMail(data, result){
  let res = "<h2>Order in Lihe Shop</h2>";
  let total = 0;
  for(const element of result){
    res += `<p>${element['name']} - ${data.key[element['id']]} - ${element['cost'] * data.key[element['id']]} uah</p>`;
    total += element['cost']*data.key[element['id']];
  }
  console.log(res);
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