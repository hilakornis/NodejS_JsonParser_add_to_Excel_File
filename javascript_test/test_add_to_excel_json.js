// var jsonData = req.body.jsonData;
// var truckIDSerial = req.body.truckIDSerial;

const Excel = require('exceljs');
 


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

// console.log(jsonData);

function parseJsonMsgInsertToExcel(json_obj, excel_file) {
    const json_truckIDSerial = json_obj.truckIdSerial;

    const json_payload = json_obj.payload;
    console.log("this is the truckIDSerial: "+json_truckIDSerial);

    console.log("This is the payload len:" ); 
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
    
    let workbook = new Excel.Workbook();
    let worksheet = workbook.addWorksheet('json');

    worksheet.columns = [
        {header: 'truckIdSerial', key: 'truckIdSerial'},
        {header: 'canId', key: 'canId'},
        {header: 'strCanData', key: 'strCanData'},
        {header: 'systemTickTimestamp', key: 'systemTickTimestamp'},
        {header: 'dateHourSecondsTimeReceived', key: 'dateHourSecondsTimeReceived'}
              
    ];
        worksheet.addRow({truckIdSerial : "0", canId: "1",  strCanData: "2", systemTickTimestamp : "3", dateHourSecondsTimeReceived: "4"});
//         let data = ["a","b","c"];

//       // Dump all the data into Excel
// data.forEach((e, index) => {
//     // row 1 is the header.
//     const rowIndex = index + 2
  
//     // By using destructuring we can easily dump all of the data into the row without doing much
//     // We can add formulas pretty easily by providing the formula property.
//     worksheet.addRow({
//       ...e,
//       systemTickTimestamp: 2,
//       dateHourSecondsTimeReceived: 1
//     })
//   })

      workbook.xlsx.writeFile('Json_data_from_truck.xlsx');
    return worksheet;
}

function writeToExcel(worksheet, header, element ){

}
const json_obj = JSON.parse(jsonData);

// parseJsonMsgInsertToExcel(json_obj);
var res ; 

createExcelFile(res);



// check if the file exists. 
// excel = getFile(path) 
//if (excel )


//Adding to excel: 

