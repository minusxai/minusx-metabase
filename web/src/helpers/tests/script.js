/*
Helper file to debug HTML via query selectors
*/

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { JSDOM } = require('jsdom');

// Read file synchronously
const filePath = './src/file.html'; // Adjust the file path to the html of the page
const fullDom = fs.readFileSync(filePath, 'utf8');
// const dom = new DOMParser().parseFromString(fullDom, 'text/html');
const dom = new JSDOM(fullDom, { runScripts: 'dangerously' });
const document = dom.window.document;

module.exports = document;
