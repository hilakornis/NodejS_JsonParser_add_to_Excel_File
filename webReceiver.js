//jshint esversion: 9
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const consts = require('./constants/consts');
const functions = require('./constants/functions');
const mongoUtils = require('./mongoUtils');
const hodAkevMongo = require('./constants/hodAkevMongo');
const jimp = require('jimp');
const jimp_resize = require('jimp');
const fs = require('fs');
const iridiumWebMessage = require('./iridiumWebMessage');
const sbdQueueManager = require("./sbdQueueManager");
app.use(express.static(__dirname));
// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));
const express1 = require('express-fileupload');
app.use(express1());

///////////////////////////CarLocator App //////////////////////////////////////////////////////////////////////////
app.post('/CL', function(req, res) {
  const carLocatorWebRequestHandler = require("./CarLocator/carLocatorWebRequestHandler");
  carLocatorWebRequestHandler.handle(req.body, res);
});

app.post('/getConfigCarLocator', function(req, res) {
  console.log("getConfigCarLocator POST request");
  let file = fs.readFileSync('/var/www/html/server/CarLocator/configCarLocator.json');
  let hodAkev = JSON.parse(file);
  res.send(hodAkev);
});


///////////////////////////modemTCP //////////////////////////////////////////////////////////////////////////
app.post('/modemTest', function(req, res) {
  const modemLogs = require("./modemService/modemLogs");
  if(req.body.action == "clear") {
    modemLogs.clearLogs(req, res);
  } else {
    modemLogs.getLogs(req, res);
  }
});

///////////////////////////Hod Akev App //////////////////////////////////////////////////////////////////////////
app.post('/getConfigHodAkev', function(req, res) {
  console.log("getConfigHodAkev POST request");
  let file = fs.readFileSync('/var/www/html/server/HodAkev/config.json');
  let hodAkev = JSON.parse(file);
  res.send(hodAkev);
});

app.route("/hodAkevMain")
// show mobilegroup website service.
.get(function(request, response) {
    console.log("hodAkevMain GET request");
    response.render('hodAkevMain');
});

app.route("/hodAkevSignBoardBySerial")
.get(function(req, res) {
  console.log("hodAkevSignBoardBySerial GET request");
  res.render('hodAkevSignBoardBySerial');
})
.post(async function(req, res) {
  let TAG = "hodAkevSignBoardBySerial POST: ";
  console.log(TAG);
  console.log(req.body);
  var result = await hodAkevMongo.findOneFromCollection({username : req.body.username, password : req.body.password}, consts.adminFootprintUsersCollection);
  if(!result) {
      console.log(consts.responseInvalidParams);
      res.render("result", {msg : consts.responseInvalidParams});
  } else if("timestamp" in  result && (Date.now() - result.timestamp) > consts.timestampOneHour) {
      console.log(TAG + req.body.username + ": " + consts.responsePasswordExpired);
      res.render("result", {msg : req.body.username + ": " + consts.responsePasswordExpired});
  } else {
      serial = await hodAkevMongo.findOneFromCollection({mac : req.body.serial}, consts.boardsCollection);
      mac = await hodAkevMongo.findOneFromCollection({mac : req.body.mac}, consts.boardsCollection);
      if(serial) {
          console.log(TAG + "serial number already exists");
          res.render("result", {msg : "serial number already exists"});
      } else if(mac) {
          console.log(TAG + "mac address already exists");
          res.render("result", {msg : "mac address already exists"});
      } else {
          await hodAkevMongo.insertToDB({serial : req.body.serial, mac : req.body.mac, timestampRegistered : Date.now()}, consts.boardsCollection, true);
          console.log(TAG + "Added Successfully " + req.body.serial + " to mac address " + req.body.mac);
          res.render("result", {msg : "Added Successfully " + req.body.serial + " to mac address " + req.body.mac});

      }
  }
});

app.route("/hodAkevUploadFlashImu")
.get(function(req, res) {
  console.log("hodAkevUploadFlashImu GET: ");
  res.render('hodAkevUploadFlashImu');
})
.post(async function(req, res) {
    var TAG = "hodAkevUploadFlashImu POST: ";
    var result = await hodAkevMongo.findOneFromCollection({username : req.body.username, password : req.body.password}, consts.adminFootprintUsersCollection);
    if(!result) {
        console.log(TAG + "username or password for admin user is not correct");
        res.render("hodAkevResult", {msg : "username or password for admin user is not correct"});
    } else if("timestamp" in  result && (Date.now() - result.timestamp) > consts.timestampOneHour) {
        console.log(TAG + ": password expired for " + req.body.username);
        res.render("hodAkevResult", {msg : ": password expired for " + req.body.username});
    } else if ("files" in req){
      console.log(TAG + "{ username : " + req.body.username + " , password : " + req.body.password + " , data " + req.files.file.data + " }");
      var filename = req.files.file.name;
      while(filename.includes(':')) {
        filename = filename.replace(":", '');
      }
      fs.writeFileSync("/var/www/html/server/HodAkev/flashImus/" + filename, req.files.file.data);
      console.log(TAG + "File uploaded seccessfully. name of file is " + filename);
      res.render("hodAkevResult", {msg : "File uploaded seccessfully. name of file is " + filename});
    } else {
      console.log(TAG + "params missing");
      res.render("hodAkevResult", {msg : "params missing"});
    }
});

app.post('/hodAkevDeviceUploadFlashImu', async function(req, res) {
    var TAG = "hodAkevDeviceUploadFlashImu POST: ";
    console.log(TAG);
    if("filename" in req.body && "imuData" in req.body) {
      console.log(TAG + req.body.filename);
      while(req.body.filename.includes(':')) {
        req.body.filename = req.body.filename.replace(":", '');
      }
      req.body.imuData = req.body.imuData.replace(/^data:image\/\w+;base64,/, "");
      while(req.body.imuData.indexOf(" ") > -1)
      {
        req.body.imuData = req.body.imuData.replace(" ", "+");
      }
      var buff = Buffer.from(req.body.imuData,'base64');
      console.log(Buffer.byteLength(buff));
      fs.writeFileSync("/var/www/html/server/HodAkev/flashImus/" + req.body.filename, buff);
      console.log(TAG + "File uploaded seccessfully. name of file is " + req.body.filename);
      res.send({status : "OK"});
    } else {
      res.send({status : "ERROR", reason : "missing parameters"});
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
        fs.rmSync("/var/www/html/server/HodAkev/flashImus/" + req.body.filename);
        console.log(TAG + "File removed successfully. name of file is " + req.body.filename);
        res.send({status : "OK"});
    } else {
        res.send({status : "ERROR", reason : "missing parameters"});
    }
});

app.route("/hodAkevGetFlashImu")
.post(function(req, res) {
    console.log("hodAkevGetFlashImu POST: ");
    console.log(req.body);
    const hodAkevGetImuBuffer = require('./HodAkev/hodAkevGetImuBuffer.js');
    hodAkevGetImuBuffer.getImuBuffer(req.body, res);

});

app.post("/hodAkevSendPassword", async function(req, res) {
    var TAG = "/hodAkevSendPassword POST: ";
    const nodemailer = require('nodemailer');
    var transporter = nodemailer.createTransport({
        SES: new AWS.SES({
            apiVersion: '2010-12-01'
        })
    });
    console.log(TAG);
    console.log(req.body);
    var newPwd = functions.passwordMaker();
    console.log(TAG + "create pass: " + newPwd);
    var user = await hodAkevMongo.findOneFromCollection({username : req.body.username}, consts.adminFootprintUsersCollection);
    if(user) {
      await hodAkevMongo.updateCollection({username : req.body.username}, {password : newPwd, timestamp : Date.now()}, consts.adminFootprintUsersCollection);
      var mailOptions = {
        from: consts.emailUser,
        to: user.email,
        subject: 'New Password Footprint Web Service',
        text: 'username: ' + req.body.username + '\nPassword: ' + newPwd
      };
      transporter.sendMail(mailOptions, function(error, info){
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

///////////////////////////CarassoServiceCenters App //////////////////////////////////////////////////////////////////////////
app.post('/carassoJson', function(req, res) {
  console.log("carassoJson POST request");
  let file = fs.readFileSync('/var/www/html/server/Carasso/CarassoServiceCenters.json');
  let carassoJson = JSON.parse(file);
  res.send(carassoJson);
});

///////////////////////////Mobile Group website //////////////////////////////////////////////////////////////////////////
const urlMgSatellite = '/MGsatellite';
app.route(urlMgSatellite)
// show mobilegroup website service.
.get(function(request, response) {
    console.log("MGsatellite GET request");
    response.render('satellite_site');
});

const urlRegisterUser = '/MGsatellite/registerNewSatteliteUser';
app.route(urlRegisterUser)
.get(function(req, res) {
    res.render('register_new_sattelite_user');
})
.post(async function(req, res) {
    var TAG = urlRegisterUser + " POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await mongoUtils.findOneFromCollection({username : req.body.username, password : req.body.password}, consts.adminSatelliteUsersCollection);
    if(!result) {
        console.log(consts.responseInvalidParams);
        res.render("result", {msg : consts.responseInvalidParams});
    } else if("timestamp" in  result && (Date.now() - result.timestamp) > consts.timestampOneHour) {
        console.log(TAG + req.body.username + ": " + consts.responsePasswordExpired);
        res.render("result", {msg : req.body.username + ": " + consts.responsePasswordExpired});
    } else {
        if(!functions.validateEmail(req.body.email)) {
            console.log(TAG + consts.reasonEmailAddress);
            res.render("result", {msg : consts.reasonEmailAddress});
        } else if(!functions.checkImeiValidity(req.body.imei)) {
            console.log(TAG + consts.responseImeiNotValid);
            res.render("result", {msg : consts.responseImeiNotValid});
        } else {
            result = await mongoUtils.findOneFromCollection({imei : req.body.imei}, consts.usersCollection);
            if(result) {
                console.log(TAG + consts.reasonUserAlreadyExist);
                res.render("result", {msg : consts.reasonUserAlreadyExist});
            } else {
                console.log(TAG + "checking if there are paired phones available");
                var findResult = await mongoUtils.findOneFromCollection({used : false}, consts.phonesCollection);
                if(findResult && "phone" in findResult) {
                  await mongoUtils.updateCollection({phone: findResult.phone, used : false}, {used : true}, consts.phonesCollection);
                  console.log(TAG + "inserting new user to users collection");
                  var newUser = await mongoUtils.insertToDB({imei : req.body.imei, mac : req.body.mac, name : req.body.name, maxMessagesPerImage : consts.defaultChunksPerImage, sosPhoneContact : consts.defaultSettings, phone : findResult.phone,
                      SerialKey : functions.secretKeyGenerator(), timestampRegistered : Date.now(), msgId : 0, sosEmailContact: consts.defaultSettings}, consts.usersCollection, true);
                  res.render("result", {msg:"User " + req.body.name + " : " + req.body.imei + " has been inserted"});
                } else {
                  console.log(TAG + consts.responseNoPairedPhonesAvailable);
                  res.render("result",{msg : consts.responseNoPairedPhonesAvailable});
                }
            }
        }
    }
});

const urlRemoveUser = '/MGsatellite/removeSatteliteUser';
app.route(urlRemoveUser)
.get(function(req, res) {
    res.render('remove_new_sattelite_user');
})
.post(async function(req, res) {
    var TAG = urlRemoveUser + " POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await mongoUtils.findOneFromCollection({username : req.body.username, password : req.body.password}, consts.adminSatelliteUsersCollection);
    if(!result) {
        console.log(TAG + consts.responseInvalidParams);
        res.render("result", {msg : consts.responseInvalidParams});
    } else if("timestamp" in  result && (Date.now() - result.timestamp) > consts.timestampOneHour) {
        console.log(TAG + req.body.username + ": " + consts.responsePasswordExpired);
        res.render("result", {msg : req.body.username + ": " + consts.responsePasswordExpired});
    } else {
        var user = await mongoUtils.findOneFromCollection({imei : req.body.imei, name : req.body.name, phone : req.body.pairedPhone}, consts.usersCollection);
        if(!user) {
            console.log(TAG + consts.responseSatteliteUserDoesntExist);
            res.render("result", {msg : consts.responseSatteliteUserDoesntExist});
        } else {
            console.log(TAG + "removing user " + user.name);
            await mongoUtils.deleteOneFromCollection({imei : req.body.imei, name : req.body.name, phone : req.body.pairedPhone}, consts.usersCollection);
            await mongoUtils.updateCollection({phone: req.body.pairedPhone},{used : false}, consts.phonesCollection);
            res.render("result", {msg:"User " + req.body.name + " : " + req.body.imei + " has been removed and paired phone " + req.body.pairedPhone + " is now available again"});
        }
    }
});

const urlGetUserDetails = '/MGsatellite/getSatteliteUserDetails';
app.route(urlGetUserDetails)
.get(function(req, res) {
    res.render('get_sattelite_user_details');
})
.post(async function(req, res) {
  var TAG = urlGetUserDetails + " POST: ";
    console.log(TAG);
    console.log(req.body);
    var result = await mongoUtils.findOneFromCollection({username : req.body.username, password : req.body.password}, consts.adminSatelliteUsersCollection);
    if(!result) {
        console.log(TAG + consts.responseInvalidParams);
        res.render("result", {msg : consts.responseInvalidParams});
    } else if("timestamp" in  result && (Date.now() - result.timestamp) > consts.timestampOneHour) {
        console.log(TAG + req.body.username + ": " + consts.responsePasswordExpired);
        res.render("result", {msg : req.body.username + ": " + consts.responsePasswordExpired});
    } else {
        var user = await mongoUtils.findOneFromCollection({imei : req.body.imei}, consts.usersCollection);
        if(!user) {
            console.log(TAG + consts.responseSatteliteUserDoesntExist);
            res.render("result", {msg : consts.responseSatteliteUserDoesntExist});
        } else {
            console.log(user);
            var resultStringBuilder = "";
            for (const [key, value] of Object.entries(user)) {
              if(key != "_id") {
                resultStringBuilder += key + " : " + value + " <br>";
              }
            }
            res.render('result', {msg:resultStringBuilder});
        }
    }
});


var AWS = functions.getAwsSdk();
// create new password and send to admin user mail.
app.post('/send_password', async function(req, res) {
    var TAG = "/send_password POST: ";
    const nodemailer = require('nodemailer');
    var transporter = nodemailer.createTransport({
        SES: new AWS.SES({
            apiVersion: '2010-12-01'
        })
    });
    console.log(TAG);
    console.log(req.body);
    var newPwd = functions.passwordMaker();
    console.log(TAG + "create pass: " + newPwd);
    var user = await mongoUtils.findOneFromCollection({username : req.body.username}, consts.adminSatelliteUsersCollection);
    if(user) {
      await mongoUtils.updateCollection({username : req.body.username}, {password : newPwd, timestamp : Date.now()}, consts.adminSatelliteUsersCollection);
      var mailOptions = {
        from: consts.emailUser,
        to: user.email,
        subject: 'New Password MobileGroupSatellite',
        text: 'username: ' + req.body.username + '\nPassword: ' + newPwd
      };
      transporter.sendMail(mailOptions, function(error, info){
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
app.post('/' + consts.serverFolder + "/getUtils", async function(request, response) {
  if("currentVersion" in request.body && "imei" in request.body) {
      var res = await mongoUtils.findOneFromCollection({imei: request.body.imei, mac : request.body.mac}, consts.usersCollection);
      if(res) {
          await mongoUtils.updateCollection({imei: request.body.imei}, {version : request.body.currentVersion}, consts.usersCollection);
          let file = fs.readFileSync('sbdConfigNew.json');
          let configJson = JSON.parse(file);
          response.send(configJson);
      } else {
        response.send({status : consts.statusError, reason: consts.reasonImeINotSigned});
      }
  } else {
      response.send({status: consts.statusError, reason: consts.reasonMissingParams});
  }
});

//getUtils for old versions
app.post('/' + consts.serverFolder + "/get_utils", function(request, response) {
  let file = fs.readFileSync('sbdConfig.json');
  let configJson = JSON.parse(file);
  response.send(configJson);
});

app.post('/' + consts.serverFolder + "/get_utils", async function(request, response) {
  if("currentVersion" in request.body && "imei" in request.body) {
      var res = await mongoUtils.findOneFromCollection({imei: request.body.imei, mac : request.body.mac}, consts.usersCollection);
      if(res) {
          await mongoUtils.updateCollection({imei: request.body.imei}, {version : request.body.currentVersion}, consts.usersCollection);
          let file = fs.readFileSync('sbdConfig.json');
          let configJson = JSON.parse(file);
          response.send(configJson);
      } else {
        response.send({status : consts.statusError, reason: consts.reasonImeINotSigned});
      }
  } else {
      response.send({status: consts.statusError, reason: consts.reasonMissingParams});
  }
});

//get secret encryption key
app.post('/' + consts.serverFolder + "/getSerialKey", async function(request, response) {
  console.log("getSerialKey POST: ");
  console.log(request.body);
  if("imei" in request.body && "mac" in request.body) {
    var user = await mongoUtils.findOneFromCollection({imei: request.body.imei, mac : request.body.mac}, consts.usersCollection);
    if(user && "SerialKey" in user) {
      response.send({status: consts.statusOk, SerialKey: user.SerialKey});
    } else if(user) {
      user.SerialKey = functions.secretKeyGenerator();
      response.send({status: consts.statusOk, SerialKey: user.SerialKey});
      await mongoUtils.updateCollection({imei: request.body.imei, mac : request.body.mac}, user, consts.usersCollection);
    } else {
      response.send({status : consts.statusError, reason: consts.reasonMissingParams});
    }
  } else {
    response.send({status: consts.statusError, reason: consts.reasonMissingParams});
  }
});

//getLocationpPost Rafael
app.post('/' + consts.serverFolder + "/getLocationsForImeis", function(request, response) {
  require("./locations").getLocationsPOST(request, response);
});

//uploadLocation
app.post('/' + consts.serverFolder + "/uploadLocation", function(request, response) {
  require("./locations").uploadLocationPOST(request, response);
});

app.post('/' + consts.serverFolder + "/uploadLocations", function(request, response) {
  require("./locations").uploadLocationsPOST(request, response);
});

// get details of user
app.post('/' + consts.serverFolder + "/getUserDetails", async function(request, response) {
    var TAG = "webReceiver->getUserDetails POST: ";
    console.log(TAG);
    console.log(request.body);
    if("imei" in request.body && "mac" in request.body) {
      var user = await mongoUtils.findOneFromCollection({imei : request.body.imei, mac : request.body.mac}, consts.usersCollection);
      if(!user) {
        console.log(TAG + consts.reasonImeINotSigned);
        response.send({status : consts.statusError, reason: consts.reasonImeINotSigned});
      } else {
        console.log(TAG + user);
        var res = {
          status : consts.statusOk, name : user.name, phone : user.phone,
          phoneNumber : user.phoneNumber, sosPhoneContact : user.sosPhoneContact, sosEmailContact : user.sosEmailContact,
          maxMessagesPerImage : user.maxMessagesPerImage, email : user.email};
        response.send(res);
      }
    } else {
        response.send({status : consts.statusError, reason: consts.reasonImeiMissing});
    }
});

// update details of user
app.post('/' + consts.serverFolder + "/updateUserDetails", async function(request, response) {
    var TAG = "webReceiver->updateUserDetails POST: ";
    console.log(TAG);
    console.log(request.body);
    if("imei" in request.body && "mac" in request.body) {
      await mongoUtils.updateCollection({imei : request.body.imei, mac : request.body.mac}, request.body, consts.usersCollection);
      console.log(TAG + "user details updated");
      response.send({status : consts.statusOk});
    } else {
      response.send({status : consts.statusError, reason: consts.reasonImeiMissing});
    }
});

// web service for post requests from iridium.
app.post('/' + consts.serverFolder + "/iridiumWebMessage", async function(request, response) {
    var TAG = "webReceiver->iridiumWebMessage POST: ";
    console.log(TAG);
    if("sender" in request.body && "mac" in request.body) {
      var user = await mongoUtils.findOneFromCollection({imei : request.body.sender, mac : request.body.mac}, consts.usersCollection);
      if(user) {
          request.body.network = consts.networkTypeInternet;
          if("type" in request.body && request.body.type == consts.typeSos) { //sos
              console.log(TAG + "typeSos");
              request.body.senderTimestamp = parseInt(request.body.senderTimestamp);
              request.body.timestamp = Date.now();
              request.body.date = functions.getDate();
              request.body.time = functions.getCurrentTime();
              require("./iridiumWebMessage").handleSosWebMessage(request.body, response);
          } else if("type" in request.body){ // iridium / whatsapp / email / sms
              require("./iridiumWebMessage").handleWebMessage(request.body, response);
          }
      } else {
          response.send({status : consts.statusError, reason: consts.reasonImeINotSigned});
      }
    } else {
      response.send({status : consts.statusError, reason: consts.reasonMissingParams});
    }
});

app.post('/' + consts.serverFolder + "/clientMessagesRequests", async function(request, response) {
    var TAG = "webReceiver->clientMessagesRequests: ";
    if("imei" in request.body && "mac" in request.body) {
        var user = await mongoUtils.findOneFromCollection({imei : request.body.imei, mac : request.body.mac}, consts.usersCollection);
        if(user) {
            var result = await mongoUtils.findFromCollection({receiver : request.body.imei, status : consts.statusReady}, consts.messagesCollection);
            if(result.length > 0) {
                await sbdQueueManager.cleanWaitingQueueForImei(request.body.imei);
                console.log(TAG + result.length + " messages for " + request.body.imei);
                var counter = 1;
                result.forEach((message) => {
                    console.log(TAG + "message no." + counter + ". sender: " + message.sender + " , type: " + message.type + " , format: " + message.format + " , msgId: " + message.msgId);
                    counter++;
                });
                response.send({numberOfMessages : result.length, messages : result});
                await mongoUtils.updateManyFromCollection({receiver : request.body.imei, status : consts.statusReady},
                  {status: consts.statusSent, network : consts.networkTypeInternet, msgContent:""}, consts.messagesCollection);
            } else {
                response.send({numberOfMessages : 0});
            }
        } else {
            response.send({status : consts.statusError, reason: consts.reasonImeINotSigned});
        }
    } else {
        response.send({status : consts.statusError, reason: consts.responseMissingImeiParam});
    }
});

///////////////////////////receiving Email messages and sending to iridium //////////////////////////////////////////////////////////////////////////
app.get('/reply/:id', function(req, res) {
    require("./mailToSatellite").idGetRequest(req, res);
});

app.post("/send_mail_reply", function(req, res) {
    require("./mailToSatellite").sendMailReply(req, res);
});

///////////////////////////receiving SMS messages and sending to iridium //////////////////////////////////////////////////////////////////////////

app.post('/' + consts.serverFolder + "/SMS", function(request, response) {
  require("./smsToSatellite").smsToSatelliteHandler(request, response);
});

///////////////////////////receiving voice alerts and sending to iridium //////////////////////////////////////////////////////////////////////////
app.post('/' + consts.serverFolder + '/playSoundOnImei', function(request, response) {
  require('./voiceAlertToSatellite').voiceAlertToSatelliteHandler(request, response);
});

///////////////////////////receiving whatsapp messages and sending to iridium //////////////////////////////////////////////////////////////////////////

app.post('/' + consts.serverFolder, function(request, response) {
  console.log('POST from whatsapp to iridium');
  console.log(request.body);
  if(request.body.SmsStatus == 'received') {
      require("./whatsappToSatellite").handleWhatsapp(request, request.body.Body, response);
  } else {
      console.log("webReceiver response to whatsapp: " + consts.reasonGeneralError);
      functions.sendResponse(consts.reasonGeneralError, response);
  }

});

app.listen(4050, function(){
  console.log("Web listener server listens on port 4050");
});
