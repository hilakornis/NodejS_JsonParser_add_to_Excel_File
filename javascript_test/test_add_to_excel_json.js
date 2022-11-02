// var jsonData = req.body.jsonData;
// var truckIDSerial = req.body.truckIDSerial;

const fs = require("fs");
var jsonData =   '{ "truckIdSerial": "0", "payload": [{ ' +
	'"canId": "canId123",' +
	'	"strCanData": "strCanData123",' +
		'"systemTickTimestamp": "1667218442221",' +
		'"dateHourSecondsTimeReceived": "31_10_2022_00:14:02.222"' +
	'}, {'+
    '"canId": "canId000",' +
	'	"strCanData": "strCanData000",' +
		'"systemTickTimestamp": "166721844333",' +
		'"dateHourSecondsTimeReceived": "31_10_2022_00:14:02.333"' +
    '}]' +
'}';


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

const json_msg = JSON.parse(jsonData);
parseJsonMsgInsertToExcel(json_msg);



