//jshint esversion: 9
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const consts = require("./constants/consts");
const functions = require("./constants/functions");
const mongoUtils = require("./mongoUtils");
const hodAkevMongo = require("./constants/hodAkevMongo");
const jimp = require("jimp");
const jimp_resize = require("jimp");
const fs = require("fs");
const iridiumWebMessage = require("./iridiumWebMessage");
const sbdQueueManager = require("./sbdQueueManager");
const galooliUtils = require('./galooliUtils');
const util = require('util');
const modemDataUtils = require('./modemDataUtils');
const elevations = require('./Elevation/getElevations2');
app.use(express.static(__dirname));
// set the view engine to ejs
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
const express1 = require("express-fileupload");
app.use(express1());

///////////////////////////modemTCP //////////////////////////////////////////////////////////////////////////
app.post("/modemLog", function (req, res) {
  const modemLogs = require("./modemService/modemLogs");
  if (req.body.action == "clear") {
    modemLogs.clearLogs(req, res);
  } else {
    modemLogs.getLogs(req, res);
  }
});

///////////////////////////CAN Data //////////////////////////////////////////////////////////////////////////

function parseJsonMsgInsertToExcel(json_obj) {
  const json_truckIDSerial = json_obj.truckIdSerial;

  const json_payload = json_obj.payload;
  // console.log("this is the truckIDSerial: "+json_truckIDSerial);

  // console.log("This is the payload len:" ); 
  // console.log( json_payload.length);

  // console.log("here are the items in the payload:");

  // var text ="";
  for (let i in json_obj.payload) {
      var payload_element  = json_obj.payload[i];
      // console.log("\nElement #"+i+" :");
      var canId = json_obj.payload[i].canId;
      // console.log(canId);
      var strCanData = json_obj.payload[i].strCanData;
      // console.log(strCanData);
      var systemTickTimestamp = json_obj.payload[i].systemTickTimestamp;
      // console.log(systemTickTimestamp);
      var dateHourSecondsTimeReceived = json_obj.payload[i].dateHourSecondsTimeReceived;
      // console.log(dateHourSecondsTimeReceived);
      try {
          if(!fs.existsSync(__dirname + '/CANdata/truck_messages.json')){
              fs.writeFileSync(__dirname + '/CANdata/truck_messages.json', "[]");
          }
              // Add the new area to covered_areas.json            
              const data = fs.readFileSync(__dirname + '/CANdata/truck_messages.json');
              // console.log('data = ' + data);
              let jsonArray = JSON.parse(data);
              // console.log('jsonArray = ' + jsonArray);
              let newEntry = {"truckIDSerial": json_truckIDSerial,
                               "canId": canId,
                              "strCanData": strCanData,
                              "systemTickTimestamp" : systemTickTimestamp,
                              "dateHourSecondsTimeReceived" : dateHourSecondsTimeReceived
                          };
              
              jsonArray.push(newEntry);
              // console.log('jsonArray = ' + JSON.stringify(jsonArray, null, 1));    
              fs.writeFileSync(__dirname + '/CANdata/truck_messages.json', JSON.stringify(jsonArray, null, 1));
  
          
  } catch (e) {
     console.log(e);
  }
}
}

app.post("/CANdata", function (req, res) {
  var TAG = "CANdata POST | ";
  var statusOK = true;
  if ("truckIDSerial" in req.body && "jsonData" in req.body) {
    var jsonData = req.body.jsonData;
    var truckIDSerial = req.body.truckIDSerial;

    console.log(TAG + truckIDSerial + ' | ' + jsonData);


    const json_msg = JSON.parse(jsonData);
    parseJsonMsgInsertToExcel(json_msg);
    

	res.send({status: "OK", reason: "OK"});
  } else {
    console.log(TAG + "error");
	res.send({status: "ERROR", reason: "missing parameters"});
  }
//  const CANdatum = require("./CANservices/CANdata");
//   CANdatum.procesData(req, res);
});

app.post("/modemUploadData", async function (req, res) {
  var TAG = "modemUploadData POST | ";

  if ("file" in req.body && "data" in req.body) {
    console.log(TAG + "file:" + req.body.file);
    req.body.data = req.body.data.replace(/^data:image\/\w+;base64,/, "");

    while (req.body.data.indexOf(" ") > -1) {
      req.body.data = req.body.data.replace(" ", "+");
    }

    var buff = Buffer.from(req.body.data, "base64");
    console.log(Buffer.byteLength(buff));

    fs.writeFileSync(
      "/var/www/html/server/modemService/uploads/" + req.body.file,
      buff
    );

    fs.open('/var/www/html/server/modemService/log.txt', 'a', 666, function(e, id) {
     fs.write( id, req.body.file + ' ' + buff.length + '\r\n', null, 'utf8', function() {
      fs.close(id, function() {
       console.log(TAG + 'LOG file is updated');
      });
     });
    });

    console.log(TAG + "Uploaded status: OK");
    res.send({ status: "OK" });
  } else {
    console.log(TAG + "Uploaded status: ERROR (missing params)");
    res.send({status: "ERROR", reason: "missing parameters"});
  }
});

app.get("/getModemData", async function(req, res) {
    var TAG = "getModemData GET | ";

    console.log(TAG + "calling modemDataUtils.getFiles()");

    const result = await modemDataUtils.getFiles();

    res.send(result);
});

///////////////////////////Hod Akev App //////////////////////////////////////////////////////////////////////////
app.post("/getConfigHodAkev", function (req, res) {
  console.log("getConfigHodAkev POST request");
  let file = fs.readFileSync("/var/www/html/server/HodAkev/config.json");
  let hodAkev = JSON.parse(file);
  res.send(hodAkev);
});

app
  .route("/hodAkevMain")
  // show mobilegroup website service.
  .get(function (request, response) {
    console.log("hodAkevMain GET request");
    response.render("hodAkevMain");
  });

app
  .route("/hodAkevSignBoardBySerial")
  .get(function (req, res) {
    console.log("hodAkevSignBoardBySerial GET request");
    res.render("hodAkevSignBoardBySerial");
  })
  .post(async function (req, res) {
    let TAG = "hodAkevSignBoardBySerial POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await hodAkevMongo.findOneFromCollection(
      { username: req.body.username, password: req.body.password },
      consts.adminFootprintUsersCollection
    );
    if (!result) {
      console.log(consts.responseInvalidParams);
      res.render("result", { msg: consts.responseInvalidParams });
    } else if (
      "timestamp" in result &&
      Date.now() - result.timestamp > consts.timestampOneHour
    ) {
      console.log(
        TAG + req.body.username + ": " + consts.responsePasswordExpired
      );
      res.render("result", {
        msg: req.body.username + ": " + consts.responsePasswordExpired,
      });
    } else {
      serial = await hodAkevMongo.findOneFromCollection(
        { mac: req.body.serial },
        consts.boardsCollection
      );
      mac = await hodAkevMongo.findOneFromCollection(
        { mac: req.body.mac },
        consts.boardsCollection
      );
      if (serial) {
        console.log(TAG + "serial number already exists");
        res.render("result", { msg: "serial number already exists" });
      } else if (mac) {
        console.log(TAG + "mac address already exists");
        res.render("result", { msg: "mac address already exists" });
      } else {
        await hodAkevMongo.insertToDB(
          {
            serial: req.body.serial,
            mac: req.body.mac,
            timestampRegistered: Date.now(),
          },
          consts.boardsCollection,
          true
        );
        console.log(
          TAG +
            "Added Successfully " +
            req.body.serial +
            " to mac address " +
            req.body.mac
        );
        res.render("result", {
          msg:
            "Added Successfully " +
            req.body.serial +
            " to mac address " +
            req.body.mac,
        });
      }
    }
  });

app
  .route("/hodAkevUploadFlashImu")
  .get(function (req, res) {
    console.log("hodAkevUploadFlashImu GET: ");
    res.render("hodAkevUploadFlashImu");
  })
  .post(async function (req, res) {
    var TAG = "hodAkevUploadFlashImu POST: ";
    var result = await hodAkevMongo.findOneFromCollection(
      { username: req.body.username, password: req.body.password },
      consts.adminFootprintUsersCollection
    );
    if (!result) {
      console.log(TAG + "username or password for admin user is not correct");
      res.render("hodAkevResult", {
        msg: "username or password for admin user is not correct",
      });
    } else if (
      "timestamp" in result &&
      Date.now() - result.timestamp > consts.timestampOneHour
    ) {
      console.log(TAG + ": password expired for " + req.body.username);
      res.render("hodAkevResult", {
        msg: ": password expired for " + req.body.username,
      });
    } else if ("files" in req) {
      console.log(
        TAG +
          "{ username : " +
          req.body.username +
          " , password : " +
          req.body.password +
          " , data " +
          req.files.file.data +
          " }"
      );
      var filename = req.files.file.name;
      while (filename.includes(":")) {
        filename = filename.replace(":", "");
      }
      fs.writeFileSync(
        "/var/www/html/server/HodAkev/flashImus/" + filename,
        req.files.file.data
      );
      console.log(
        TAG + "File uploaded seccessfully. name of file is " + filename
      );
      res.render("hodAkevResult", {
        msg: "File uploaded seccessfully. name of file is " + filename,
      });
    } else {
      console.log(TAG + "params missing");
      res.render("hodAkevResult", { msg: "params missing" });
    }
  });

app.post("/hodAkevDeviceUploadFlashImu", async function (req, res) {
  var TAG = "hodAkevDeviceUploadFlashImu POST: ";
  console.log(TAG);
  if ("filename" in req.body && "imuData" in req.body) {
    console.log(TAG + req.body.filename);
    while (req.body.filename.includes(":")) {
      req.body.filename = req.body.filename.replace(":", "");
    }
    req.body.imuData = req.body.imuData.replace(/^data:image\/\w+;base64,/, "");
    while (req.body.imuData.indexOf(" ") > -1) {
      req.body.imuData = req.body.imuData.replace(" ", "+");
    }
    var buff = Buffer.from(req.body.imuData, "base64");
    console.log(Buffer.byteLength(buff));
    fs.writeFileSync(
      "/var/www/html/server/HodAkev/flashImus/" + req.body.filename,
      buff
    );
    console.log(
      TAG + "File uploaded seccessfully. name of file is " + req.body.filename
    );
    res.send({ status: "OK" });
  } else {
    res.send({ status: "ERROR", reason: "missing parameters" });
  }
});

app.post('/hodAkevDeviceRemoveFlashImu', async function(req, res) {
    var TAG = "hodAkevDeviceRemoveFlashImu POST: ";
    console.log(TAG);
    if ("filename" in req.body) {
        console.log(TAG + req.body.filename);
        while (req.body.filename.includes(':')) {
            req.body.filename = req.body.filename.replace(":", '');
        }
        fs.unlinkSync("/var/www/html/server/HodAkev/flashImus/" + req.body.filename);
        console.log(TAG + "File removed successfully. name of file is " + req.body.filename);
        res.send({status : "OK"});
    } else {
        res.send({status : "ERROR", reason : "missing parameters"});
    }
});

app.route("/hodAkevGetFlashImu").post(function (req, res) {
  console.log("hodAkevGetFlashImu POST: ");
  console.log(req.body);
  const hodAkevGetImuBuffer = require("./HodAkev/hodAkevGetImuBuffer.js");
  hodAkevGetImuBuffer.getImuBuffer(req.body, res);
});

app.post("/hodAkevSendPassword", async function (req, res) {
  var TAG = "/hodAkevSendPassword POST: ";
  const nodemailer = require("nodemailer");
  var transporter = nodemailer.createTransport({
    SES: new AWS.SES({
      apiVersion: "2010-12-01",
    }),
  });
  console.log(TAG);
  console.log(req.body);
  var newPwd = functions.passwordMaker();
  console.log(TAG + "create pass: " + newPwd);
  var user = await hodAkevMongo.findOneFromCollection(
    { username: req.body.username },
    consts.adminFootprintUsersCollection
  );
  if (user) {
    await hodAkevMongo.updateCollection(
      { username: req.body.username },
      { password: newPwd, timestamp: Date.now() },
      consts.adminFootprintUsersCollection
    );
    var mailOptions = {
      from: consts.emailUser,
      to: user.email,
      subject: "New Password Footprint Web Service",
      text: "username: " + req.body.username + "\nPassword: " + newPwd,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.sendStatus(500);
      } else {
        console.log(TAG + consts.responseNewPassSent);
        res.send(consts.responseNewPassSent);
      }
    });
  } else {
    res.send(consts.responseAdminUserNotExist);
    console.log(TAG + consts.responseAdminUserNotExist);
  }
});

app.get("/hodAkevGetAreaList", async function(req, res) {
    console.log('in hodAkevGetAreaList()');

    fs.readFile(consts.ElevationDirFullPath + 'covered_areas.json', (err, data) => {
        if (err) {
            console.log('error: ' + err);
            res.send('Areas file not found');
        }
        res.send(data);
    });
});

app.get("/hodAkevGetAreaFile", async function(req, res) {
    console.log('in hodAkevGetAreaFile()');

    if (typeof req.query.fileName != 'undefined') {
        fs.readFile(consts.ElevationDirFullPath + req.query.fileName, (err, data) => {
            if (err) {
                console.log('error: ' + err);
                res.send('file ' + req.query.fileName + ' not found');
            }
            res.send(data);
        });
    } else {
        res.send('fileName parameter is missing');
    }
});

//
///////////////////////////CarassoServiceCenters App //////////////////////////////////////////////////////////////////////////
app.post("/carassoJson", function (req, res) {
  console.log("carassoJson POST request");
  let file = fs.readFileSync(
    "/var/www/html/server/Carasso/CarassoServiceCenters.json"
  );
  let carassoJson = JSON.parse(file);
  res.send(carassoJson);
});

///////////////////////////Mobile Group website //////////////////////////////////////////////////////////////////////////
const urlMgSatellite = "/MGsatellite";
app
  .route(urlMgSatellite)
  // show mobilegroup website service.
  .get(function (request, response) {
    console.log("MGsatellite GET request");
    response.render("satellite_site");
  });

const urlRegisterUser = "/MGsatellite/registerNewSatteliteUser";
app
  .route(urlRegisterUser)
  .get(function (req, res) {
    res.render("register_new_sattelite_user");
  })
  .post(async function (req, res) {
    var TAG = urlRegisterUser + " POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await mongoUtils.findOneFromCollection(
      { username: req.body.username, password: req.body.password },
      consts.adminSatelliteUsersCollection
    );
    if (!result) {
      console.log(consts.responseInvalidParams);
      res.render("result", { msg: consts.responseInvalidParams });
    } else if (
      "timestamp" in result &&
      Date.now() - result.timestamp > consts.timestampOneHour
    ) {
      console.log(
        TAG + req.body.username + ": " + consts.responsePasswordExpired
      );
      res.render("result", {
        msg: req.body.username + ": " + consts.responsePasswordExpired,
      });
    } else {
      if (!functions.validateEmail(req.body.email)) {
        console.log(TAG + consts.reasonEmailAddress);
        res.render("result", { msg: consts.reasonEmailAddress });
      } else if (!functions.checkImeiValidity(req.body.imei)) {
        console.log(TAG + consts.responseImeiNotValid);
        res.render("result", { msg: consts.responseImeiNotValid });
      } else {
        result = await mongoUtils.findOneFromCollection(
          { imei: req.body.imei },
          consts.usersCollection
        );
        if (result) {
          console.log(TAG + consts.reasonUserAlreadyExist);
          res.render("result", { msg: consts.reasonUserAlreadyExist });
        } else {
          console.log(TAG + "checking if there are paired phones available");
          var findResult = await mongoUtils.findOneFromCollection(
            { used: false },
            consts.phonesCollection
          );
          if (findResult && "phone" in findResult) {
            await mongoUtils.updateCollection(
              { phone: findResult.phone, used: false },
              { used: true },
              consts.phonesCollection
            );
            console.log(TAG + "inserting new user to users collection");
            var newUser = await mongoUtils.insertToDB(
              {
                imei: req.body.imei,
                mac: req.body.mac,
                name: req.body.name,
                maxMessagesPerImage: consts.defaultChunksPerImage,
                sosPhoneContact: consts.defaultSettings,
                phone: findResult.phone,
                SerialKey: functions.secretKeyGenerator(),
                timestampRegistered: Date.now(),
                msgId: 0,
                sosEmailContact: consts.defaultSettings,
              },
              consts.usersCollection,
              true
            );
            res.render("result", {
              msg:
                "User " +
                req.body.name +
                " : " +
                req.body.imei +
                " has been inserted",
            });
          } else {
            console.log(TAG + consts.responseNoPairedPhonesAvailable);
            res.render("result", {
              msg: consts.responseNoPairedPhonesAvailable,
            });
          }
        }
      }
    }
  });

const urlRemoveUser = "/MGsatellite/removeSatteliteUser";
app
  .route(urlRemoveUser)
  .get(function (req, res) {
    res.render("remove_new_sattelite_user");
  })
  .post(async function (req, res) {
    var TAG = urlRemoveUser + " POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await mongoUtils.findOneFromCollection(
      { username: req.body.username, password: req.body.password },
      consts.adminSatelliteUsersCollection
    );
    if (!result) {
      console.log(TAG + consts.responseInvalidParams);
      res.render("result", { msg: consts.responseInvalidParams });
    } else if (
      "timestamp" in result &&
      Date.now() - result.timestamp > consts.timestampOneHour
    ) {
      console.log(
        TAG + req.body.username + ": " + consts.responsePasswordExpired
      );
      res.render("result", {
        msg: req.body.username + ": " + consts.responsePasswordExpired,
      });
    } else {
      var user = await mongoUtils.findOneFromCollection(
        {
          imei: req.body.imei,
          name: req.body.name,
          phone: req.body.pairedPhone,
        },
        consts.usersCollection
      );
      if (!user) {
        console.log(TAG + consts.responseSatteliteUserDoesntExist);
        res.render("result", { msg: consts.responseSatteliteUserDoesntExist });
      } else {
        console.log(TAG + "removing user " + user.name);
        await mongoUtils.deleteOneFromCollection(
          {
            imei: req.body.imei,
            name: req.body.name,
            phone: req.body.pairedPhone,
          },
          consts.usersCollection
        );
        await mongoUtils.updateCollection(
          { phone: req.body.pairedPhone },
          { used: false },
          consts.phonesCollection
        );
        res.render("result", {
          msg:
            "User " +
            req.body.name +
            " : " +
            req.body.imei +
            " has been removed and paired phone " +
            req.body.pairedPhone +
            " is now available again",
        });
      }
    }
  });

const urlGetUserDetails = "/MGsatellite/getSatteliteUserDetails";
app
  .route(urlGetUserDetails)
  .get(function (req, res) {
    res.render("get_sattelite_user_details");
  })
  .post(async function (req, res) {
    var TAG = urlGetUserDetails + " POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await mongoUtils.findOneFromCollection(
      { username: req.body.username, password: req.body.password },
      consts.adminSatelliteUsersCollection
    );
    if (!result) {
      console.log(TAG + consts.responseInvalidParams);
      res.render("result", { msg: consts.responseInvalidParams });
    } else if (
      "timestamp" in result &&
      Date.now() - result.timestamp > consts.timestampOneHour
    ) {
      console.log(
        TAG + req.body.username + ": " + consts.responsePasswordExpired
      );
      res.render("result", {
        msg: req.body.username + ": " + consts.responsePasswordExpired,
      });
    } else {
      var user = await mongoUtils.findOneFromCollection(
        { imei: req.body.imei },
        consts.usersCollection
      );
      if (!user) {
        console.log(TAG + consts.responseSatteliteUserDoesntExist);
        res.render("result", { msg: consts.responseSatteliteUserDoesntExist });
      } else {
        console.log(user);
        var resultStringBuilder = "";
        for (const [key, value] of Object.entries(user)) {
          if (key != "_id") {
            resultStringBuilder += key + " : " + value + " <br>";
          }
        }
        res.render("result", { msg: resultStringBuilder });
      }
    }
  });

var AWS = functions.getAwsSdk();
// create new password and send to admin user mail.
app.post("/send_password", async function (req, res) {
  var TAG = "/send_password POST: ";
  const nodemailer = require("nodemailer");
  var transporter = nodemailer.createTransport({
    SES: new AWS.SES({
      apiVersion: "2010-12-01",
    }),
  });
  console.log(TAG);
  console.log(req.body);
  var newPwd = functions.passwordMaker();
  console.log(TAG + "create pass: " + newPwd);
  var user = await mongoUtils.findOneFromCollection(
    { username: req.body.username },
    consts.adminSatelliteUsersCollection
  );
  if (user) {
    await mongoUtils.updateCollection(
      { username: req.body.username },
      { password: newPwd, timestamp: Date.now() },
      consts.adminSatelliteUsersCollection
    );
    var mailOptions = {
      from: consts.emailUser,
      to: user.email,
      subject: "New Password MobileGroupSatellite",
      text: "username: " + req.body.username + "\nPassword: " + newPwd,
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.sendStatus(500);
      } else {
        console.log(TAG + consts.responseNewPassSent);
        res.send(consts.responseNewPassSent);
      }
    });
  } else {
    res.send(consts.responseAdminUserNotExist);
    console.log(TAG + consts.responseAdminUserNotExist);
  }
});

///////////////////////////Mobile Group post requests from clients //////////////////////////////////////////////////////////////////////////
//getUtils
app.post(
  "/" + consts.serverFolder + "/getUtils",
  async function (request, response) {
    console.log("in getUtils()");
    if ("currentVersion" in request.body && "imei" in request.body) {
      console.log(request.body.currentVersion + " " + request.body.imei + " " + request.body.mac);
      var res = await mongoUtils.findOneFromCollection(
        { imei: request.body.imei, mac: request.body.mac },
        consts.usersCollection
      );
      if (res) {
        console.log("getUtils if");
        await mongoUtils.updateCollection(
          { imei: request.body.imei },
          { version: request.body.currentVersion },
          consts.usersCollection
        );
        let file = fs.readFileSync("sbdConfigNew.json");
        let configJson = JSON.parse(file);
        response.send(configJson);
      } else {
        console.log("getUtils else 1");
        response.send({
          status: consts.statusError,
          reason: consts.reasonImeINotSigned,
        });
      }
    } else {
        console.log("getUtils else 2");
      response.send({
        status: consts.statusError,
        reason: consts.reasonMissingParams,
      });
    }
  }
);

//getUtils for old versions
app.post(
  "/" + consts.serverFolder + "/get_utils",
  function (request, response) {
    let file = fs.readFileSync("sbdConfig.json");
    let configJson = JSON.parse(file);
    response.send(configJson);
  }
);

app.post(
  "/" + consts.serverFolder + "/get_utils",
  async function (request, response) {
    if ("currentVersion" in request.body && "imei" in request.body) {
      var res = await mongoUtils.findOneFromCollection(
        { imei: request.body.imei, mac: request.body.mac },
        consts.usersCollection
      );
      if (res) {
        await mongoUtils.updateCollection(
          { imei: request.body.imei },
          { version: request.body.currentVersion },
          consts.usersCollection
        );
        let file = fs.readFileSync("sbdConfig.json");
        let configJson = JSON.parse(file);
        response.send(configJson);
      } else {
        response.send({
          status: consts.statusError,
          reason: consts.reasonImeINotSigned,
        });
      }
    } else {
      response.send({
        status: consts.statusError,
        reason: consts.reasonMissingParams,
      });
    }
  }
);

//get secret encryption key
app.post(
  "/" + consts.serverFolder + "/getSerialKey",
  async function (request, response) {
    console.log("getSerialKey POST: ");
    console.log(request.body);
    if ("imei" in request.body && "mac" in request.body) {
      var user = await mongoUtils.findOneFromCollection(
        { imei: request.body.imei, mac: request.body.mac },
        consts.usersCollection
      );
      if (user && "SerialKey" in user) {
        console.log("user && SerialKey in user");
        response.send({ status: consts.statusOk, SerialKey: user.SerialKey });
      } else if (user) {
        console.log("user only");
        user.SerialKey = functions.secretKeyGenerator();
        response.send({ status: consts.statusOk, SerialKey: user.SerialKey });
        await mongoUtils.updateCollection(
          { imei: request.body.imei, mac: request.body.mac },
          user,
          consts.usersCollection
        );
      } else {
        console.log("in else 1");
        response.send({
          status: consts.statusError,
          reason: consts.reasonMissingParams,
        });
      }
    } else {
      console.log("in else 2");
      response.send({
        status: consts.statusError,
        reason: consts.reasonMissingParams,
      });
    }
  }
);

//getLocationpPost Rafael
app.post(
  "/" + consts.serverFolder + "/getLocationsForImeis",
  function (request, response) {
    require("./locations").getLocationsPOST(request, response);
  }
);

//uploadLocation
app.post(
  "/" + consts.serverFolder + "/uploadLocation",
  function (request, response) {
    console.log("uploadLocation");
    require("./locations").uploadLocationPOST(request, response);
  }
);

app.post(
  "/" + consts.serverFolder + "/uploadLocations",
  function (request, response) {
    console.log("uploadLocations");
    require("./locations").uploadLocationsPOST(request, response);
  }
);

// get details of user
app.post(
  "/" + consts.serverFolder + "/getUserDetails",
  async function (request, response) {
    var TAG = "webReceiver->getUserDetails POST: ";
    console.log(TAG);
    console.log(request.body);
    if ("imei" in request.body && "mac" in request.body) {
      var user = await mongoUtils.findOneFromCollection(
        { imei: request.body.imei, mac: request.body.mac },
        consts.usersCollection
      );
      if (!user) {
        console.log(TAG + consts.reasonImeINotSigned);
        response.send({
          status: consts.statusError,
          reason: consts.reasonImeINotSigned,
        });
      } else {
        console.log(TAG + user);
        var res = {
          status: consts.statusOk,
          name: user.name,
          phone: user.phone,
          phoneNumber: user.phoneNumber,
          sosPhoneContact: user.sosPhoneContact,
          sosEmailContact: user.sosEmailContact,
          maxMessagesPerImage: user.maxMessagesPerImage,
          email: user.email,
        };
        response.send(res);
      }
    } else {
      response.send({
        status: consts.statusError,
        reason: consts.reasonImeiMissing,
      });
    }
  }
);

// update details of user
app.post(
  "/" + consts.serverFolder + "/updateUserDetails",
  async function (request, response) {
    var TAG = "webReceiver->updateUserDetails POST: ";
    console.log(TAG);
    console.log(request.body);
    if ("imei" in request.body && "mac" in request.body) {
      await mongoUtils.updateCollection(
        { imei: request.body.imei, mac: request.body.mac },
        request.body,
        consts.usersCollection
      );
      console.log(TAG + "user details updated");
      response.send({ status: consts.statusOk });
    } else {
      response.send({
        status: consts.statusError,
        reason: consts.reasonImeiMissing,
      });
    }
  }
);

// web service for post requests from iridium.
app.post(
  "/" + consts.serverFolder + "/iridiumWebMessage",
  async function (request, response) {
    var TAG = "webReceiver->iridiumWebMessage POST: ";
    console.log(TAG);
    if ("sender" in request.body && "mac" in request.body) {
      var user = await mongoUtils.findOneFromCollection(
        { imei: request.body.sender, mac: request.body.mac },
        consts.usersCollection
      );
      if (user) {
        request.body.network = consts.networkTypeInternet;
        if ("type" in request.body && request.body.type == consts.typeSos) {
          //sos
          console.log(TAG + "typeSos");
          request.body.senderTimestamp = parseInt(request.body.senderTimestamp);
          request.body.timestamp = Date.now();
          request.body.date = functions.getDate();
          request.body.time = functions.getCurrentTime();
          require("./iridiumWebMessage").handleSosWebMessage(
            request.body,
            response
          );
        } else if ("type" in request.body) {
          // iridium / whatsapp / email / sms
          require("./iridiumWebMessage").handleWebMessage(
            request.body,
            response
          );
        }
      } else {
        response.send({
          status: consts.statusError,
          reason: consts.reasonImeINotSigned,
        });
      }
    } else {
      response.send({
        status: consts.statusError,
        reason: consts.reasonMissingParams,
      });
    }
  }
);

app.post(
  "/" + consts.serverFolder + "/clientMessagesRequests",
  async function (request, response) {
    var TAG = "webReceiver->clientMessagesRequests: ";
    if ("imei" in request.body && "mac" in request.body) {
      var user = await mongoUtils.findOneFromCollection(
        { imei: request.body.imei, mac: request.body.mac },
        consts.usersCollection
      );
      if (user) {
        var result = await mongoUtils.findFromCollection(
          { receiver: request.body.imei, status: consts.statusReady },
          consts.messagesCollection
        );
        if (result.length > 0) {
          await sbdQueueManager.cleanWaitingQueueForImei(request.body.imei);
          console.log(
            TAG + result.length + " messages for " + request.body.imei
          );
          var counter = 1;
          result.forEach((message) => {
            console.log(
              TAG +
                "message no." +
                counter +
                ". sender: " +
                message.sender +
                " , type: " +
                message.type +
                " , format: " +
                message.format +
                " , msgId: " +
                message.msgId
            );
            counter++;
          });
          response.send({ numberOfMessages: result.length, messages: result });
          await mongoUtils.updateManyFromCollection(
            { receiver: request.body.imei, status: consts.statusReady },
            {
              status: consts.statusSent,
              network: consts.networkTypeInternet,
              msgContent: "",
            },
            consts.messagesCollection
          );
        } else {
          response.send({ numberOfMessages: 0 });
        }
      } else {
        response.send({
          status: consts.statusError,
          reason: consts.reasonImeINotSigned,
        });
      }
    } else {
      response.send({
        status: consts.statusError,
        reason: consts.responseMissingImeiParam,
      });
    }
  }
);

///////////////////////////receiving Email messages and sending to iridium //////////////////////////////////////////////////////////////////////////
app.get("/reply/:id", function (req, res) {
  require("./mailToSatellite").idGetRequest(req, res);
});

app.post("/send_mail_reply", function (req, res) {
  require("./mailToSatellite").sendMailReply(req, res);
});

///////////////////////////receiving SMS messages and sending to iridium //////////////////////////////////////////////////////////////////////////

app.post("/" + consts.serverFolder + "/SMS", function (request, response) {
  require("./smsToSatellite").smsToSatelliteHandler(request, response);
});

///////////////////////////receiving voice alerts and sending to iridium //////////////////////////////////////////////////////////////////////////
app.post(
  "/" + consts.serverFolder + "/playSoundOnImei",
  function (request, response) {
    console.log("playSoundOnImei POST request");
    require("./voiceAlertToSatellite").voiceAlertToSatelliteHandler(
      request,
      response
    );
  }
);

///////////////////////////receiving whatsapp messages and sending to iridium //////////////////////////////////////////////////////////////////////////

app.post("/" + consts.serverFolder, function (request, response) {
  console.log("POST from whatsapp to iridium");
  console.log(request.body);
  if (request.body.SmsStatus == "received") {
    require("./whatsappToSatellite").handleWhatsapp(
      request,
      request.body.Body,
      response
    );
  } else {
    console.log(
      "webReceiver response to whatsapp: " + consts.reasonGeneralError
    );
    functions.sendResponse(consts.reasonGeneralError, response);
  }
});

// Handle new elevation request
app.route('/new_elevation_area')
    .get(function(req, res) {
        console.log('in new_elevation_area GET');
        console.log('dirname = ' + __dirname);
        res.sendFile(__dirname + '/new_area.html');
    })
    .post(async function(req, res) {
        console.log('in new_elevation_area POST');
        console.log('params = ' + util.inspect(req.body));

        // Check validity of arguments
        if (req.body.area_name.length === 0) {
            res.send('Area name is not defined');
            return;
        } else {
            if (req.body.area_name.endsWith('.json')) {
                console.log('Area name ends with .json');
            } else {
                if (req.body.area_name.includes('.')) {
                    res.send(`Illegal area name: ${req.body.area_name}`);
                    return;
                }
                console.log('Area name does not end with .json');
                req.body.area_name = req.body.area_name.concat('.json');
            }
        }
        req.body.area_name = req.body.area_name.replace(/ /g, '_'); // replace all whitespaces with underscores
        console.log('area_name = ' + req.body.area_name);
        if (fs.existsSync(__dirname + '/Elevation/' + req.body.area_name)) {
            res.send(`File ${req.body.area_name} already exists.<br>Please choose another name.`);
            return;
        }
        if (req.body.bottom_left_lat.length === 0) {
            res.send('Bottom left latitude is not defined');
            return;
        } else if (isNaN(req.body.bottom_left_lat) || isNaN(parseFloat(req.body.bottom_left_lat))) {
            res.send('Bottom left latitude is not numeric');
            return;
        }
        if (req.body.bottom_left_lng.length === 0) {
            res.send('Bottom left longitude is not defined');
            return;
        } else if (isNaN(req.body.bottom_left_lng) || isNaN(parseFloat(req.body.bottom_left_lng))) {
            res.send('Bottom left longitude is not numeric');
            return;
        }
        if (req.body.top_right_lat.length === 0) {
            res.send('Top right latitude is not defined');
            return;
        } else if (isNaN(req.body.top_right_lat) || isNaN(parseFloat(req.body.top_right_lat))) {
            res.send('Top right latitude is not numeric');
            return;
        }
        if (req.body.top_right_lng.length === 0) {
            res.send('Top right longitude is not defined');
            return;
        } else if (isNaN(req.body.top_right_lng) || isNaN(parseFloat(req.body.top_right_lng))) {
            res.send('Top right longitude is not numeric');
            return;
        }

        // Check the distance between the points
        const dist = elevations.getDistance(parseFloat(req.body.bottom_left_lat), parseFloat(req.body.bottom_left_lng), 
            parseFloat(req.body.top_right_lat), parseFloat(req.body.top_right_lng));
        console.log(`distance = ${dist} kilometers`);
        if (dist > 16) {
            res.send('Distance > 16 kilometers: too large');
            return;
        }

        try {
            const data = fs.readFileSync(__dirname + '/Elevation/covered_areas.json');
            console.log('data = ' + data);
            let jsonArray = JSON.parse(data);
            console.log('jsonArray = ' + jsonArray);
            let newEntry = {};
            newEntry[req.body.area_name] = {"from": `${req.body.bottom_left_lat},${req.body.bottom_left_lng}`, 
                                            "to": `${req.body.top_right_lat},${req.body.top_right_lng}`};
            jsonArray.push(newEntry);
            console.log('jsonArray = ' + jsonArray);
            //let result = await elevations.getElevationsExported(req.body.area_name, parseFloat(req.body.bottom_left_lat), parseFloat(req.body.bottom_left_lng),
                //parseFloat(req.body.top_right_lat), parseFloat(req.body.top_right_lng));
            elevations.getElevationsExported(req.body.area_name, parseFloat(req.body.bottom_left_lat), parseFloat(req.body.bottom_left_lng),
                parseFloat(req.body.top_right_lat), parseFloat(req.body.top_right_lng));
            var i = 0;
            let intervalId = setInterval(() => {
                if (fs.existsSync(consts.ElevationDirFullPath + req.body.area_name)) {
                    console.log(`File ${req.body.area_name} exists`);
                    clearInterval(intervalId);
                    // Add the new area to covered_areas.json
                    fs.writeFileSync(__dirname + '/Elevation/covered_areas.json', JSON.stringify(jsonArray, null, 4));
                    res.send('distance: ' + dist + '<br><pre>' + JSON.stringify(jsonArray, null, 4) + `</pre><br>File ${req.body.area_name} was created`);
                } else {
                    console.log('File ${req.body.area_name} does not exist');
                }
                i++;
                if (i === 10) {
                    console.log('Clearing the interval');
                    clearInterval(intervalId);
                    console.log(`Could not create file ${req.body.area_name}`);
                    res.send(`Could not create file ${req.body.area_name}`);
                }
            }, 1000);
            
            /*.then(function(res2) {
                // Add the new area to covered_areas.json
                fs.writeFileSync(__dirname + '/Elevation/covered_areas.json', JSON.stringify(jsonArray, null, 4));
                res.send('distance: ' + dist + '<br><pre>' + JSON.stringify(jsonArray, null, 4) + `</pre><br>File ${req.body.area_name} was created with size of ${res2} bytes`);
            }) 
            .catch(function(err) {
                res.send(`File ${req.body.area_name} was not created. Error: ${err}`);
            });*/
        } catch (e) {
            res.send(e);
        }
        //res.send(req.body.area_name);
    });

app.listen(4050, function () {
  console.log("Web listener server listens on port 4050");
});

