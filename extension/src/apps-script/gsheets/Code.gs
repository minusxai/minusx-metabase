function gsheetGetState() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = spreadsheet.getSheets();
  
  // Object to store sheet state information
  var sheetState = {
    sheets: []
  };

  sheets.forEach(function(sheet) {
    var sheetInfo = {
      sheetName: sheet.getName(),
      regions: []
    };

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var rows = values.length;
    var cols = values[0].length;

    // Identify regions with non-empty values
    var currentRegion = null;
    for (var row = 0; row < rows; row++) {
      var rowData = values[row];
      var nonEmptyCols = rowData.filter(function(cell) { return cell !== ''; });

      // Start a new region when we find a non-empty row
      if (nonEmptyCols.length > 0 && currentRegion === null) {
        currentRegion = {
          startRow: row + 1,  // 1-based index
          headers: rowData,    // Headers are the first non-empty row
          rows: [],
          width: nonEmptyCols.length,  // Region width based on first row
          height: 1  // Start height at 1 for the header row
        };
      } else if (nonEmptyCols.length > 0 && currentRegion) {
        // If region started, add non-header rows
        if (row - currentRegion.startRow < 3) {
          currentRegion.rows.push(rowData); // Add first 2 rows below headers
        }
        currentRegion.height++;  // Increment height for each row added
      } else if (nonEmptyCols.length === 0 && currentRegion) {
        // End of current region if we hit an empty row
        sheetInfo.regions.push(currentRegion);
        currentRegion = null;
      }
    }

    // Push the last region if it didn't end with an empty row
    if (currentRegion) {
      sheetInfo.regions.push(currentRegion);
    }

    sheetState.sheets.push(sheetInfo);
  });

  return JSON.stringify(sheetState);
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

// expression = `getColumnIndexByValue("Campaign Data", "Customer_Segment")`

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