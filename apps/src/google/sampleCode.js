function countCompaniesStartingWithR(sheetData) {
  // Extract the rows from the sheet data
  const rows = sheetData.cells;
  // Initialize a counter for companies starting with 'r'
  let count = 0;
  // Iterate over the rows, starting from the second row (index 1) to skip the header
  for (let i = 1; i < rows.length; i++) {
    const companyName = rows[i][2].value;
    // Check if the company name starts with 'r' or 'R'
    if (companyName.toLowerCase().startsWith('r')) {
      count++;
    }
  }
  return count;
}