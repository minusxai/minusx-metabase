function setRangeFormula(range, formula) {
  range.setFormula(formula)
}

function getCurrentSelectionRange(sheet) {
  var selection = sheet.getActiveRange();  // Get the current selection range

  // If no selection, return an empty object
  if (!selection) {
    return {};
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

  // Function to interpret number formats
  function interpretFormat(format) {
    if (format.includes('%')) {
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
    var sheetInfo = {
      isActive: activeSheet.getName() == sheetName,
      name: sheetName,
      regions: [],
      selectedRange: getCurrentSelectionRange(sheet),
    };

    var dataRange = sheet.getRange(1, 1, 10, sheet.getLastColumn());
    var values = dataRange.getValues();
    var formulas = dataRange.getFormulas();
    var numberFormats = dataRange.getNumberFormats();

    // Identify regions with non-empty values
    var currentRegion = null;
    var startRow = 0;
    for (var row = 0; row < 10; row++) {
      var rowData = values[row];
      var nonEmptyCols = rowData.filter(function(cell) { return cell !== ''; });

      // Start a new region when we find a non-empty row
      if (nonEmptyCols.length > 0 && currentRegion === null) {
        currentRegion = {
          headers: rowData,    // Headers are the first non-empty row
          sampleRows: [],
          numColumns: nonEmptyCols.length  // Region width based on first row
        };
      } else if (nonEmptyCols.length > 0 && currentRegion) {
        // If region started, add non-header rows
        if (startRow < 2) {
          var rowInfo = rowData.map(function(cell, colIndex) {
            return {
              value: cell,
              isFormula: formulas[row][colIndex] !== '',    // Check if it's a formula
              format: interpretFormat(numberFormats[row][colIndex])  // Get interpreted format
            };
          });
          currentRegion.sampleRows.push(rowInfo); // Add first 2 rows below headers
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