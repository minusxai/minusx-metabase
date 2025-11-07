const BASE_URL = "https://v2.minusxapi.com";
const LLM_RESPONSE_URL = BASE_URL + "/planner/getLLMResponse";
const SCRAPE_URL = BASE_URL + "/web/scrape";


function md5(inputString) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, inputString)
    .reduce((output, byte) => output + (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'), '');
}

function getCache(a1Notation){
  const key = "cell_" + a1Notation;
  const cache = CacheService.getDocumentCache();
  const cachedInputOutput = cache.get(key);
  if (cachedInputOutput === null){
    return null
  }
  else{
    return cachedInputOutput.split("<delimiter>")
  }
}

function updateCache(a1Notation, inputHash, output){
  const key = "cell_" + a1Notation;
  const cache = CacheService.getDocumentCache();
  cache.put(key, inputHash + "<delimiter>" +  output, 21600);
}

function gsheetSetUserToken(token) {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('userToken', token);
}

function queryContent(content, query){
  const scriptProperties = PropertiesService.getScriptProperties();
  const userToken = scriptProperties.getProperty('userToken');
  const systemMessage = `You are used as a google apps script function. You will be given an array of cell values and a query and your response will be used to set the current cell value.`
  const userMessage = `<CellValues>${content}</CellValues>
<Query>${query}</Query>`
  let payload = {
    "messages": [
        {
            "role": "system",
            "content": systemMessage
        },
        {
            "role": "user",
            "content": userMessage
        }
    ],
    "actions": [],
    "llmSettings": {
        "model": "gpt-4.1",
        "temperature": 0,
        "response_format": {
            "type": "text"
        },
        "tool_choice": "required"
    }
  }
  // Optionally, return or log the result
  let options = {
    'method': 'POST',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
    'headers': {
      'Authorization': `Bearer ${userToken}`
    }
  };
  let responseCode
  try {
    let response = UrlFetchApp.fetch(LLM_RESPONSE_URL, options);
    responseCode = response.getResponseCode()
    let result = JSON.parse(response.getContentText());
    if (responseCode == 200) {
      return result.content
    } else if (responseCode == 401) {
      return 'Unauthorized. Please login to the MinusX sidebar'
    } else if (responseCode == 402) {
      return 'Credits Expired. Please add a membership to continue'
    } else {
      return `An error occured. Status Code: ${responseCode}`
    }
  } catch (err) {
    return 'An unexpected error occured'
  }
}

function setRangeFormula(range, formula) {
  range.setFormula(formula)
}

function getCurrentSelectionRange(sheet) {
  var selection = sheet.getActiveRange();  // Get the current selection range

  // If no selection, return an empty object
  if (!selection) {
    return {
      numRows: 1,
      numColumns: 1
    };
  }

  var rangeInfo = {
    startRow: selection.getRow(),
    startColumn: selection.getColumn(),
    numRows: selection.getNumRows(),
    numColumns: selection.getNumColumns(),
    values: selection.getValues()  // Optionally, return the values in the selected range
  };

  // Logger.log(JSON.stringify(rangeInfo))
  return rangeInfo;
}

function gsheetGetState() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  var activeSheet = spreadsheet.getActiveSheet();
  
  // Object to store sheet state information
  var sheetState = {
    sheets: []
  };

  // Function to interpret number formats and detect strings
  function interpretFormat(value, format) {
    if (typeof value === 'string') {
      return 'String';
    } else if (format.includes('%')) {
      return 'Percentage';
    } else if (format.includes('$') || format.includes('€') || format.includes('£') || format.includes('₹')) {
      return 'Currency';
    } else if (format.match(/^\d{4}-\d{2}-\d{2}/) || format.toLowerCase().includes('d')) {
      return 'Date';
    } else if (format.includes('0.###############') || format.includes('0.00')) {
      return 'Number';
    } else {
      return 'General';
    }
  }

  sheets.forEach(function(sheet) {
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var selection = getCurrentSelectionRange(sheet);
    var sheetInfo = {
      isActive: activeSheet.getName() == sheetName,
      name: sheetName,
      regions: [],
      lastRow,
      lastColumn,
    };
    if (selection.numRows != 1 || selection.numColumns != 1) {
      sheetInfo.selectedRange = selection;
    }
    if (lastRow == 0 && lastColumn == 0) {
      sheetState.sheets.push(sheetInfo);
      return;
    }

    var dataRange = sheet.getRange(1, 1, 10, lastColumn);
    var values = dataRange.getValues();
    var formulas = dataRange.getFormulas();
    var numberFormats = dataRange.getNumberFormats();
    var displayValues = dataRange.getDisplayValues(); 

    // Identify regions with non-empty values
    var currentRegion = null;
    var startRow = 0;
    for (var row = 0; row < 10; row++) {
      var rowData = values[row];
      var nonEmptyCols = rowData.filter(function(cell) { return cell !== ''; });

      // Start a new region when we find a non-empty row
      if (nonEmptyCols.length > 0 && currentRegion === null) {
        currentRegion = {
          firstRow: rowData,    // Headers are the first non-empty row
          numColumns: nonEmptyCols.length  // Region width based on first row
        };
      } else if (nonEmptyCols.length > 0 && currentRegion) {
        // If region started, add non-header rows
        if (startRow < 2) {
          var rowInfo = rowData.map(function(cell, colIndex) {
            var isFormula = formulas[row][colIndex] !== '';
            var displayValue = displayValues[row][colIndex]
            var cellInfo = {
              value: cell,
              format: interpretFormat(cell, numberFormats[row][colIndex])  // Get interpreted format
            };
            if (cell != displayValue) {
              cellInfo.displayValue = displayValue
            }
            if (isFormula) {
              cellInfo.formula = formulas[row][colIndex];
            }
            return cellInfo;
          });
          if (startRow == 0) {
            currentRegion.secondRow = rowInfo;
          }
          startRow += 1;
        }
      } else if (nonEmptyCols.length === 0 && currentRegion) {
        // End of current region if we hit an empty row
        sheetInfo.regions.push(currentRegion);
        currentRegion = null;
        startRow = 0;
      }
    }

    // Push the last region if it didn't end with an empty row
    if (currentRegion) {
      sheetInfo.regions.push(currentRegion);
    }

    sheetState.sheets.push(sheetInfo);
  });

  Logger.log(sheetState);
  return JSON.stringify(sheetState);
}

function columnIndexToLetter(columnIndex) {
  var letter = '';
  while (columnIndex > 0) {
    var remainder = (columnIndex - 1) % 26;
    letter = String.fromCharCode(remainder + 65) + letter;
    columnIndex = Math.floor((columnIndex - 1) / 26);
  }
  return letter;
}

function getColumnIndexByValue(sheetName, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var range = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  var values = range.getValues()[0];

  for (var i = 0; i < values.length; i++) {
    if (values[i] == value) {
      return columnIndexToLetter(i + 1); // Convert index to letter (1-based)
    }
  }
  return ''; // Return empty string if value not found
}

function gsheetEvaluate(expression) {
  // Use eval to evaluate the string expression
  var result = eval(expression);
  // Logger.log(result)
  return JSON.stringify(result);
}

function getUserSelectedRange() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveRange();  // Get the user's currently selected range
  var a1Notation = range.getA1Notation(); 
  return a1Notation;
}

function readActiveSpreadsheet(region) {
  if (!region) {
    region = getUserSelectedRange()
  }
  var range = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange(region);
  
  // Get the values, formulas, and merged status of the range
  var values = range.getValues();
  var formulas = range.getFormulas();
  var numRows = range.getNumRows();
  var numColumns = range.getNumColumns();
  
  // Initialize the cells array to store cell data
  var cells = [];

  for (var row = 0; row < numRows; row++) {
    var rowData = [];
    for (var col = 0; col < numColumns; col++) {
      var cell = range.getCell(row + 1, col + 1); // Get each cell individually
      var cellValue = values[row][col];
      var cellType = typeof cellValue;
      var isMerged = cell.isPartOfMerge();        // Check if the cell is part of a merged region
      var cellData = {
        "value": cellValue,                // The value of the cell
        "type": cellType,
        "formula": formulas[row][col] || null,    // The formula (or null if there's none)
        "isMerged": isMerged                      // Whether the cell is part of a merged range
      };
      rowData.push(cellData);                     // Add the cell data to the row
    }
    cells.push(rowData);                          // Add the row data to the cells array
  }

  // Construct the final output object
  var output = {
    "region": region,                            // The range of the spreadsheet being read
    "cells": cells                                // The cells data as an array of arrays
  };
  
  Logger.log(JSON.stringify(output));             // Log the result for debugging

  return output;                                  // Return the final output object
}

function onOpen(e) {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('MinusX')
    .addItem('Add Sidebar', 'showSidebar')
    .addToUi();
  showSidebar();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('index').setTitle('MinusX').setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}