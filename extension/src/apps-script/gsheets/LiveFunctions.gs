/**
 * Scrape the URL and answer the query
 *
 * @param {URL, query} Input the URL and the query.
 * @return query response based on the contents of the URL
 * @customfunction
 */

function MX_WEBASK(url, query) {
  const currentA1Notation = SpreadsheetApp.getActiveRange().getA1Notation();
  const hash = md5(url + "|" + query)
  const cachedInputOutput = getCache(currentA1Notation);
  let result;
  if ((cachedInputOutput === null) || (cachedInputOutput[0] !== hash)) {
    const webcontent = MX_WEBSCRAPE(url);
    result = queryContent(webcontent, query);
  } else {
    result  = cachedInputOutput[1];
  }
  updateCache(currentA1Notation, hash, result);
  return result;
}

/**
 * Scrape the URL
 *
 * @param {URL} Input the URL.
 * @return The contents of the URL
 * @customfunction
 */

function MX_WEBSCRAPE(url) {
  // Check if the parameter is a range by attempting to use getA1Notation
  try {
    if (url.getA1Notation) {
      throw new Error("Input cannot be a range.");
    }
  } catch (e) {
    // Not a range; proceed to check if it's a URL
  }

  // Validate if the parameter is a URL
  if (typeof url !== "string" || !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(url)) {
    throw new Error("Input must be a valid URL.");
  }

  // Fetch the URL and log the response
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const userToken = scriptProperties.getProperty('userToken');
    let options = {
      'method': 'POST',
      'contentType': 'application/json',
      'payload': JSON.stringify({"URL": url}),
      'muteHttpExceptions': true,
      'headers': {
        'Authorization': `Bearer ${userToken}`
      }
    };
    let response = UrlFetchApp.fetch(SCRAPE_URL, options);
    responseCode = response.getResponseCode()
    let result = response.getContentText();
    if (responseCode == 200) {
      return result
    } else if (responseCode == 401) {
      return 'Unauthorized. Please login to the MinusX sidebar'
    } else if (responseCode == 402) {
      return 'Credits Expired. Please add a membership to continue'
    } else {
      return `An error occured. Status Code: ${responseCode}`
    }
  } catch (e) {
    Logger.log("Failed to fetch URL: " + e.message);
  }
}

/**
 * Ask MinusX a question based on a selected range
 *
 * @param {columns, query} Input the range and query.
 * @return The answer based on selected cells and query.
 * @customfunction
 */

function MX_ASK(columns, query) {
  // columns = [0.2, 0.3]
  // query = "Is this less than majority chance?"
  let dataArray;
  if (Array.isArray(columns)) {
    dataArray = columns.flat();
  } else {
    dataArray = [columns];
  }
  const hash = md5(JSON.stringify(dataArray) + "|" + query)
  const currentA1Notation = SpreadsheetApp.getActiveRange().getA1Notation();
  const cachedInputOutput = getCache(currentA1Notation);
  let result;
  if ((cachedInputOutput === null) || (cachedInputOutput[0] !== hash)) {
    result = queryContent(JSON.stringify(dataArray), query);
  } else {
    result  = cachedInputOutput[1];
  }
  updateCache(currentA1Notation, hash, result);
  return result;
}


