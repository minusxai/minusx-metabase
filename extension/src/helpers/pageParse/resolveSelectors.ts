import { QuerySelector, QuerySelectorValue } from './querySelectorTypes';

export const resolveSelector = (querySelector: QuerySelector, parent?: Element): Element[] => {
  const { type, selector } = querySelector;
  if (type == 'XPATH') {
    return xpathSelector(selector, parent);
  } else if (type == 'CSS') {
    return cssSelector(selector, parent)
  } else {
    return []
  }
};

const cssSelector = (selector: QuerySelectorValue, parent?: Element): Element[] => {
  const elements = (parent || document).querySelectorAll(selector);
  const results: Element[] = []
  for(let i = 0; i < elements.length; i ++) {
    results.push(elements[i])
  }
  return results
}

export const xpathSelector = (selector: QuerySelectorValue, parent?: Element): Element[] => {
  // HACK(@arpit): open issue https://github.com/jsdom/jsdom/pull/3719
  // adding default args for now
  // const elements = document.evaluate(selector, document, null, 0);
  // const elements = document.evaluate(selector, parent || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  const elements = document.evaluate(selector, parent || document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
  const results = [];
  let result = elements.iterateNext();
  while (result) {
    if (result instanceof Element) {
      results.push(result);
    }
    result = elements.iterateNext();
  }
  // sort by id to ensure result is ordered as appearing in the DOM
  // results.sort((a, b) => {
  //   return a.id - b.id;
  // });
  return results;
};

