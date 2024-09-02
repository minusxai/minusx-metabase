import { QuerySelector } from './querySelectorTypes';
import { resolveSelector } from './resolveSelectors';


export const getElementsFromQuerySelector = (selector: QuerySelector, parent?: Element) => {
  const elements = resolveSelector(selector, parent);
  const range = selector.range;
  const from = range?.from || 0;
  const to = range?.to;
  return to ? elements.slice(from, to) : elements.slice(from);
};

export const getElementFromQuerySelector = (selector: QuerySelector, index: number = 0, parent?: Element) => {
  const elements = getElementsFromQuerySelector(selector, parent)
  if (elements && index in elements) {
    return elements[index]
  }
}