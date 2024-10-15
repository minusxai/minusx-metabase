function gsheetEvaluate(expression) {
  try {
    // Use eval to evaluate the string expression
    var result = eval(expression);
    Logger.log(result)
    // return result;
    return JSON.stringify(result);
  } catch (e) {
    // Handle any errors that occur during evaluation
    return "Error: " + e.message;
  }
}

function getColumnIndexByValue(sheetName, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  var values = range.getValues()[0];

  for (var i = 0; i < values.length; i++) {
    if (values[i] == value) {
      return i + 1; // Return the column index (1-based)
    }
  }
  return -1; // Value not found
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('MinusX')
    .addItem('Add Sidebar', 'showSidebar')
    .addToUi();
  showSidebar();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('index').setTitle('MinusX').setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}