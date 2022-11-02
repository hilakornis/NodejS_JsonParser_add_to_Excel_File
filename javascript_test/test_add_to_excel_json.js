// var jsonData = req.body.jsonData;
// var truckIDSerial = req.body.truckIDSerial;

const Excel = require('exceljs');
const fs = require("fs");
const path_excel = "Json_data_from_truck.xlsx";

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

var workbook = new Excel.Workbook();
const sheet_json_name = "json";
// console.log(jsonData);

function parseJsonMsgInsertToExcel(json_obj) {
    const json_truckIDSerial = json_obj.truckIdSerial;

    const json_payload = json_obj.payload;
    // console.log("this is the truckIDSerial: "+json_truckIDSerial);

    // console.log("This is the payload len:" ); 
    console.log( json_payload.length);

    // console.log("here are the items in the payload:");

    // var text ="";
    for (let i in json_obj.payload) {
        var payload_element  = json_obj.payload[i];
        console.log("\nElement #"+i+" :");
        var canId = json_obj.payload[i].canId;
        console.log(canId);
        var strCanData = json_obj.payload[i].strCanData;
        console.log(strCanData);
        var systemTickTimestamp = json_obj.payload[i].systemTickTimestamp;
        console.log(systemTickTimestamp);
        var dateHourSecondsTimeReceived = json_obj.payload[i].dateHourSecondsTimeReceived;
        console.log(dateHourSecondsTimeReceived);


        // writeToExcel(payload_element, json_truckIDSerial );
        // text += payload_element + "<br>";
    } 
    // console.log(text);


  }


  //for writing this I used: 
  //https://stackoverflow.com/questions/43607411/how-to-make-the-client-download-a-very-large-file-that-is-genereted-on-the-fly/43675707#43675707

function loadExcelFile(){
    // workbook.xlsx.readFile(path_excel);
    // var worksheet = workbook.getWorksheet(sheet_json_name);
    // worksheet.addRow({truckIdSerial : "truckIdSerial_msg", canId: "canId_element",  strCanData: "strCanData_element", systemTickTimestamp : "systemTickTimestamp_element", dateHourSecondsTimeReceived: "dateHourSecondsTimeReceived_element"});
    // return worksheet;


    // workbook.xlsx.readFile(path_excel)
    // .then(function() {
    //     var worksheet = workbook.getWorksheet(sheet_json_name);
    //     // worksheet.eachRow({ includeEmpty: true }, function(row, rowNumber) {
    //     //   console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
    //     // });
    //     worksheet.addRow({truckIdSerial : "truckIdSerial_msg", canId: "canId_element",  strCanData: "strCanData_element", systemTickTimestamp : "systemTickTimestamp_element", dateHourSecondsTimeReceived: "dateHourSecondsTimeReceived_element"});
    // });

    // let nameFileExcel = 'YourExcelFile.xlsx'
    // var workbook = new exceljs.Workbook();
    workbook.xlsx.readFile(path_excel)
    .then(function()  {
        var worksheet = workbook.getWorksheet(sheet_json_name);
        var lastRow = worksheet.lastRow;
        console.log("This is the lastRow of the excel: ");
        // console.log(lastRow.number);
        var getRowInsert = worksheet.getRow(++(lastRow.number));
        // console.log(getRowInsert);
        getRowInsert.getCell('A').value = 'truckIdSerial_msg';
        getRowInsert.commit();
        return workbook.xlsx.writeFile(path_excel);
    });



}

function createExcelFile(res){
    console.log("in createExcelFile");
    var options = {
        stream: res, // write to server response
        useStyles: false,
        useSharedStrings: false
    };

    // workbook = new Excel.Workbook();
    
    let worksheet = workbook.addWorksheet(sheet_json_name);

    worksheet.columns = [
        {header: 'truckIdSerial', key: 'truckIdSerial'},
        {header: 'canId', key: 'canId'},
        {header: 'strCanData', key: 'strCanData'},
        {header: 'systemTickTimestamp', key: 'systemTickTimestamp'},
        {header: 'dateHourSecondsTimeReceived', key: 'dateHourSecondsTimeReceived'}
              
    ];

      workbook.xlsx.writeFile(path_excel);
      
    return worksheet;
}

function writeToExcel(element, truckIdSerial_msg ){
    var canId_element = element.canId;
    // console.log(canId_element);
    var strCanData_element = element.strCanData;
    // console.log(strCanData_element);
    var systemTickTimestamp_element = element.systemTickTimestamp;
    // console.log(systemTickTimestamp_element);
    var dateHourSecondsTimeReceived_element = element.dateHourSecondsTimeReceived;
    // console.log(dateHourSecondsTimeReceived_element);

    // worksheet.addRow({truckIdSerial : truckIdSerial_msg, canId: canId_element,  strCanData: strCanData_element, systemTickTimestamp : systemTickTimestamp_element, dateHourSecondsTimeReceived: dateHourSecondsTimeReceived_element});
    // workbook.xlsx.writeFile(path_excel);

    workbook.xlsx.readFile(path_excel)
    .then(function()  {
        var worksheet = workbook.getWorksheet(sheet_json_name);
        var lastRow = worksheet.lastRow;
        // console.log("This is the lastRow of the excel: ");
        // console.log(lastRow.number);
        var getRowInsert = worksheet.getRow(++(lastRow.number));
        // console.log(getRowInsert);
        getRowInsert.getCell('A').value = truckIdSerial_msg;
        getRowInsert.getCell('B').value = canId_element;
        getRowInsert.getCell('C').value = strCanData_element;
        getRowInsert.getCell('D').value = systemTickTimestamp_element;
        getRowInsert.getCell('E').value = dateHourSecondsTimeReceived_element;
        
        
        getRowInsert.commit();
        return workbook.xlsx.writeFile(path_excel);
    });
//  
}

function write_to_file(){
    try {
        const data = fs.readFileSync(__dirname + '/CANdata/truck_messages.json');
        console.log('data = ' + data);
        let jsonArray = JSON.parse(data);
        console.log('jsonArray = ' + jsonArray);
        let newEntry = {"from": `1`};
        
        jsonArray.push(newEntry);
        console.log('jsonArray = ' + JSON.stringify(jsonArray, null, 1));

        fs.writeFileSync(__dirname + '/CANdata/truck_messages.json', JSON.stringify(jsonArray, null, 1));

        // //let result = await elevations.getElevationsExported(req.body.area_name, parseFloat(req.body.bottom_left_lat), parseFloat(req.body.bottom_left_lng),
        //     //parseFloat(req.body.top_right_lat), parseFloat(req.body.top_right_lng));
        // elevations.getElevationsExported(req.body.area_name, parseFloat(req.body.bottom_left_lat), parseFloat(req.body.bottom_left_lng),
        //     parseFloat(req.body.top_right_lat), parseFloat(req.body.top_right_lng));
        // var i = 0;
        // let intervalId = setInterval(() => {
        //     if (fs.existsSync(consts.ElevationDirFullPath + req.body.area_name)) {
        //         console.log(`File ${req.body.area_name} exists`);
        //         clearInterval(intervalId);
        //         // Add the new area to covered_areas.json
                
        //         res.send('distance: ' + dist + '<br><pre>' + JSON.stringify(jsonArray, null, 4) + `</pre><br>File ${req.body.area_name} was created`);
        //     } else {
        //         console.log('File ${req.body.area_name} does not exist');
        //     }
        //     i++;
        //     if (i === 10) {
        //         console.log('Clearing the interval');
        //         clearInterval(intervalId);
        //         console.log(`Could not create file ${req.body.area_name}`);
        //         res.send(`Could not create file ${req.body.area_name}`);
        //     }
        // }, 1000);
        
        // /*.then(function(res2) {
        //     // Add the new area to covered_areas.json
        //     fs.writeFileSync(__dirname + '/Elevation/covered_areas.json', JSON.stringify(jsonArray, null, 4));
        //     res.send('distance: ' + dist + '<br><pre>' + JSON.stringify(jsonArray, null, 4) + `</pre><br>File ${req.body.area_name} was created with size of ${res2} bytes`);
        // }) 
        // .catch(function(err) {
        //     res.send(`File ${req.body.area_name} was not created. Error: ${err}`);
        // });*/
    } catch (e) {
        console.log(e);
        // res.send(e);
    }
    //res.send(req.body.area_name);

}



let res;//todo decide what to do with it. 

// if excel doesnot exists: 
// var worksheet = createExcelFile(res); //todo get excel file
//else : 
// var worksheet = loadExcelFile();
write_to_file();
const json_obj = JSON.parse(jsonData);
parseJsonMsgInsertToExcel(json_obj);


// parseJsonMsgInsertToExcel(json_obj);
 





// check if the file exists. 
// excel = getFile(path) 
//if (excel )


//Adding to excel: 

