function insertTextAtCursor(content, url) {
  var doc = DocumentApp.getActiveDocument();
  
  // Check if there's a selection
  var selection = doc.getSelection();
  if (selection) {
    var elements = selection.getRangeElements();
    var lastElement = elements[elements.length - 1].getElement();
    
    if (lastElement.editAsText) {
      var textElement = lastElement.editAsText();
      var endOffset = elements[elements.length - 1].getEndOffsetInclusive();
      
      // Insert text after the selected text
      var newStartOffset = endOffset + 1;
      var newElement = textElement.insertText(newStartOffset, content); // Insert after the selected text
      
      // Apply the link to the new text only
      if (url) {
        var newEndOffset = newStartOffset + content.length - 1;
        textElement.setLinkUrl(newStartOffset, newEndOffset, url);
      }
    }
  }
  // If no selection, check for the cursor
  else {
    var cursor = doc.getCursor();
    if (cursor) {
      var textElement = cursor.getSurroundingText().editAsText();
      var startOffset = cursor.getSurroundingTextOffset();
      
      // Insert the content at the cursor position
      var newElement = textElement.insertText(startOffset, content);
      
      // Apply the link to the inserted text
      if (url) {
        var newEndOffset = startOffset + content.length - 1;
        textElement.setLinkUrl(startOffset, newEndOffset, url);
      }
    } else {
      Logger.log("No cursor or selection found.");
    }
  }
}


function readCurrentDoc() {
  // Get the active (currently open) Google Document
  var doc = DocumentApp.getActiveDocument();
  
  // Get the body of the document
  var body = doc.getBody();
  
  // Read the entire text content of the document
  var text = body.getText();
  
  // Optionally, return the text or process it further
  return text;
}

function onOpen() {
  var ui = DocumentApp.getUi();
  ui.createMenu('MinusX')
    .addItem('Add Sidebar', 'showSidebar')
    .addToUi();
  showSidebar();
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('index').setTitle('MinusX').setWidth(400);
  DocumentApp.getUi().showSidebar(html);
}

function insertBase64Image(base64Image) {
  // Extract the Base64 part from the data URL
  var base64String = base64Image.split(',')[1];
  
  // Convert the Base64 string to a Blob
  var decodedImage = Utilities.base64Decode(base64String);
  var blob = Utilities.newBlob(decodedImage, 'image/png', 'imageName');
  
  // Get the active Google Doc
  var doc = DocumentApp.getActiveDocument();
  
  // Check if there's a selection
  var selection = doc.getSelection();
  if (selection) {
    var rangeElements = selection.getRangeElements();
    
    // We will insert the image after the last selected element
    var lastElement = rangeElements[rangeElements.length - 1].getElement();
    
    // Get the parent of the last element, typically a paragraph
    var parentElement = lastElement.getParent();
    
    // Insert the image after the selected text
    if (parentElement.getType() === DocumentApp.ElementType.PARAGRAPH) {
      parentElement.asParagraph().appendInlineImage(blob);
    } else if (parentElement.getType() === DocumentApp.ElementType.TEXT) {
      parentElement.getParent().appendInlineImage(blob);
    }
  } 
  // If no selection, check if there's a cursor
  else {
    var cursor = doc.getCursor();
    if (cursor) {
      // Insert the image at the cursor position
      var element = cursor.insertInlineImage(blob);
      if (!element) {
        Logger.log("Unable to insert image at cursor.");
      }
    } 
    // If no cursor, append the image at the end of the document
    else {
      doc.getBody().appendImage(blob);
    }
  }
}

function readSelectedText() {
  // Get the active document
  var doc = DocumentApp.getActiveDocument();
  
  // Get the user's selection
  var selection = doc.getSelection();
  
  // Check if a selection exists
  if (selection) {
    var selectedText = '';
    
    // Get the selected elements (it can be a range of elements)
    var elements = selection.getRangeElements();
    
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      
      // Only process text elements that are fully or partially selected
      if (element.getElement().editAsText) {
        var textElement = element.getElement().editAsText();
        if (element.isPartial()) {
          // Get only the selected part of the text
          selectedText += textElement.getText().substring(element.getStartOffset(), element.getEndOffsetInclusive() + 1);
        } else {
          // Get the entire text element if fully selected
          selectedText += textElement.getText();
        }
      }
    }
    
    // Log the selected text (or you can return or use it as needed)
    Logger.log("Selected text: " + selectedText);
    return selectedText;
  } else {
    Logger.log("No text selected.");
    return "No selection";
  }
}
