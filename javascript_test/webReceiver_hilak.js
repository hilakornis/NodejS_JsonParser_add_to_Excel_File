
console.log(jsonData);

app.post("/CANdata", function (req, res) {
    var TAG = "CANdata POST | ";
    var statusOK = true;
    if ("truckIDSerial" in req.body && "jsonData" in req.body) {
      var jsonData = req.body.jsonData;
      var truckIDSerial = req.body.truckIDSerial;
      console.log(TAG + truckIDSerial + ' | ' + jsonData);
      res.send({status: "OK", reason: "OK"});
    } else {
      console.log(TAG + "error");
      res.send({status: "ERROR", reason: "missing parameters"});
    }
   const CANdatum = require("./CANservices/CANdata");
    CANdatum.procesData(req, res);
  });