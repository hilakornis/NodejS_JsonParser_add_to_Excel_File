// var jsonData = req.body.jsonData;
// var truckIDSerial = req.body.truckIDSerial;

const Excel = require('exceljs');
 
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


var workbook;
// console.log(jsonData);

function parseJsonMsgInsertToExcel(json_obj, worksheet) {
    const json_truckIDSerial = json_obj.truckIdSerial;

    const json_payload = json_obj.payload;
    console.log("this is the truckIDSerial: "+json_truckIDSerial);

    console.log("This is the payload len:" ); 
    console.log( json_payload.length);

    // console.log("here are the items in the payload:");

    // var text ="";
    for (let i in json_obj.payload) {
        var payload_element  = json_obj.payload[i];
        // console.log("\nElement #"+i+" :");
        // var canId = json_obj.payload[i].canId;
        // console.log(canId);
        // var strCanData = json_obj.payload[i].strCanData;
        // console.log(strCanData);
        // var systemTickTimestamp = json_obj.payload[i].systemTickTimestamp;
        // console.log(systemTickTimestamp);
        // var dateHourSecondsTimeReceived = json_obj.payload[i].dateHourSecondsTimeReceived;
        // console.log(dateHourSecondsTimeReceived);


        writeToExcel(worksheet, payload_element, json_truckIDSerial );
        // text += payload_element + "<br>";
    } 
    // console.log(text);


  }


  //for writing this I used: 
  //https://stackoverflow.com/questions/43607411/how-to-make-the-client-download-a-very-large-file-that-is-genereted-on-the-fly/43675707#43675707

function createExcelFile(res){
    console.log("in createExcelFile");
    var options = {
        stream: res, // write to server response
        useStyles: false,
        useSharedStrings: false
    };

    // var workbook = new Excel.stream.xlsx.WorkbookWriter(options);

    // workbook.creator = 'Hila Kornis';
    // workbook.lastModifiedBy = 'Hila Kornis';
    // workbook.created = new Date();
    // workbook.modified = new Date();
    // workbook.lastPrinted = new Date(2016, 9, 27);
    
    workbook = new Excel.Workbook();
    
    let worksheet = workbook.addWorksheet('json');

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

function writeToExcel(worksheet, element, truckIdSerial_msg ){
    var canId_element = element.canId;
    console.log(canId_element);
    var strCanData_element = element.strCanData;
    console.log(strCanData_element);
    var systemTickTimestamp_element = element.systemTickTimestamp;
    console.log(systemTickTimestamp_element);
    var dateHourSecondsTimeReceived_element = element.dateHourSecondsTimeReceived;
    console.log(dateHourSecondsTimeReceived_element);

    worksheet.addRow({truckIdSerial : truckIdSerial_msg, canId: canId_element,  strCanData: strCanData_element, systemTickTimestamp : systemTickTimestamp_element, dateHourSecondsTimeReceived: dateHourSecondsTimeReceived_element});
    workbook.xlsx.writeFile(path_excel);
//  
}
let res;//todo decide what to do with it. 
var worksheet = createExcelFile(res); //todo get excel file
const json_obj = JSON.parse(jsonData);
parseJsonMsgInsertToExcel(json_obj, worksheet);


// parseJsonMsgInsertToExcel(json_obj);
 





// check if the file exists. 
// excel = getFile(path) 
//if (excel )


//Adding to excel: 

