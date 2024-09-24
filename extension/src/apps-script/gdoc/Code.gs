function insertTextAtCursor(newContent, url) {
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  
  // Clear the existing content
  body.clear();
  
  // Convert Markdown to Google Docs format and append it
  processMarkdown(newContent, body);
}

function processMarkdown(markdown, parentElement) {
  var lines = markdown.split('\n');
  
  lines.forEach(function(line) {
    if (/^### (.*)/.test(line)) {
      // H3
      var header = line.replace(/^### (.*)/, '$1');
      parentElement.appendParagraph(header).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    } else if (/^## (.*)/.test(line)) {
      // H2
      var header = line.replace(/^## (.*)/, '$1');
      parentElement.appendParagraph(header).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    } else if (/^# (.*)/.test(line)) {
      // H1
      var header = line.replace(/^# (.*)/, '$1');
      parentElement.appendParagraph(header).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    } else if (/\!\[(.*?)\]\((.*?)\)/.test(line)) {
      // Image
      var matches = line.match(/\!\[(.*?)\]\((.*?)\)/);
      var altText = matches[1];
      var imageUrl = matches[2];
      
      if (imageUrl.startsWith('data:image')) {
        // Base64 Image
        appendBase64Image(imageUrl, parentElement);
      } else {
        // Normal URL Image
        appendImageFromUrl(imageUrl, parentElement);
      }
    } else if (/\*\*(.*)\*\*/.test(line)) {
      // Bold
      var boldText = line.replace(/\*\*(.*)\*\*/, '$1');
      var para = parentElement.appendParagraph(boldText);
      para.editAsText().setBold(true);
    } else if (/\*(.*)\*/.test(line)) {
      // Italics
      var italicText = line.replace(/\*(.*)\*/, '$1');
      var para = parentElement.appendParagraph(italicText);
      para.editAsText().setItalic(true);
    } else if (/^\[(.*)\]\((.*)\)/.test(line)) {
      // Links
      var matches = line.match(/^\[(.*)\]\((.*)\)/);
      var linkText = matches[1];
      var linkUrl = matches[2];
      var para = parentElement.appendParagraph(linkText);
      para.editAsText().setLinkUrl(linkUrl);
    } else {
      // Plain text
      parentElement.appendParagraph(line);
    }
  });
}

function appendImageFromUrl(imageUrl, parentElement) {
  try {
    var imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
    parentElement.appendImage(imageBlob);
  } catch (error) {
    Logger.log("Error fetching image from URL: " + imageUrl);
    parentElement.appendParagraph("Image failed to load: " + imageUrl);
  }
}

function appendBase64Image(base64Data, parentElement) {
  try {
    var base64Image = base64Data.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    var imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Image), 'image/png');
    parentElement.appendImage(imageBlob);
  } catch (error) {
    Logger.log("Error processing base64 image");
    parentElement.appendParagraph("Base64 image failed to load.");
  }
}

function insertTextAtCursorOld(content, url) {
  var doc = DocumentApp.getActiveDocument();
  
  // Check if there's a selection
  var selection = doc.getSelection();
  if (selection) {
    var rangeElements = selection.getRangeElements();
    var lastElement = null;
    var lastEndOffset = -1;
    var highestIndex = -1;
    
    // Loop through all selected elements to find the right-most one
    for (var i = 0; i < rangeElements.length; i++) {
      // Only process elements that have a parent in the document body
      try {
        var element = rangeElements[i].getElement();
        var endOffset = rangeElements[i].getEndOffsetInclusive();
        var parent = element.getParent();
        var currentElementIndex = doc.getBody().getChildIndex(parent);

        // Handle the case where selection ends at the end of a paragraph
        if (rangeElements[i].isPartial() || rangeElements[i].isEntireElement()) {
          // Select the element with the highest index in the document
          if (currentElementIndex > highestIndex || (currentElementIndex === highestIndex && endOffset > lastEndOffset)) {
            lastElement = element;
            lastEndOffset = endOffset;
            highestIndex = currentElementIndex;
          }
        }
      } catch (e) {
        // Log or handle any errors that occur (e.g., elements without valid parents)
        Logger.log('Error processing element: ' + e.message);
        continue; // Skip this element if there's an error
      }
    }
    
    if (lastElement && lastElement.editAsText) {
      var textElement = lastElement.editAsText();
      
      // Insert text after the right-most selected text
      var newStartOffset = lastEndOffset + 1;
      var newElement = textElement.insertText(newStartOffset, content);
      
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

function insertBase64Image(base64Image, newImgWidth) {
  // Extract the Base64 part from the data URL
  var base64String = base64Image.split(',')[1];
  
  // Convert the Base64 string to a Blob
  var decodedImage = Utilities.base64Decode(base64String);
  var blob = Utilities.newBlob(decodedImage, 'image/png', 'imageName');
  
  // Get the active Google Doc
  var doc = DocumentApp.getActiveDocument();
  
  // Check if there's a selection
  var selection = doc.getSelection();
  var imageElement;
  
  if (selection) {
    var rangeElements = selection.getRangeElements();
    
    // We will insert the image after the last selected element
    var lastElement = rangeElements[rangeElements.length - 1].getElement();
    
    // Get the parent of the last element, typically a paragraph
    var parentElement = lastElement.getParent();
    
    // Insert the image after the selected text
    if (parentElement.getType() === DocumentApp.ElementType.PARAGRAPH) {
      imageElement = parentElement.asParagraph().appendInlineImage(blob);
    } else if (parentElement.getType() === DocumentApp.ElementType.TEXT) {
      imageElement = parentElement.getParent().appendInlineImage(blob);
    }
  } 
  // If no selection, check if there's a cursor
  else {
    var cursor = doc.getCursor();
    if (cursor) {
      // Insert the image at the cursor position
      imageElement = cursor.insertInlineImage(blob);
      if (!imageElement) {
        Logger.log("Unable to insert image at cursor.");
      }
    } 
    // If no cursor, append the image at the end of the document
    else {
      imageElement = doc.getBody().appendImage(blob);
    }
  }
  
  // Set the width of the image based on the specified percentage
  if (imageElement) {
    var originalWidth = imageElement.getWidth();
    var originalHeight = imageElement.getHeight();
    
    // Calculate the new width as a percentage of the original width
    var newWidth;
    if (newImgWidth <= 10) {
      newWidth = originalWidth * newImgWidth;
    } else {
      newWidth = newImgWidth
    }
    
    // Calculate the new height to maintain the aspect ratio
    var newHeight = (newWidth / originalWidth) * originalHeight;
    
    // Set the width and height of the image
    imageElement.setWidth(newWidth);
    imageElement.setHeight(newHeight);
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
