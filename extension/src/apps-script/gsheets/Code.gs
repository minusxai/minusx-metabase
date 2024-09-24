function gsheetEvaluate(expression) {
  try {
    // Use eval to evaluate the string expression
    var result = eval(expression);
    Logger.log(result)
    return result;
  } catch (e) {
    // Handle any errors that occur during evaluation
    return "Error: " + e.message;
  }
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