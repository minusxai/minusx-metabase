import { QuerySelector } from "../../helpers/pageParse/querySelectorTypes";

export type AttachType = 'before' | 'after' | 'firstChild' | 'lastChild'

export type HTMLJSONNode = {
  tag: string; // The HTML tag name (e.g., 'div', 'p', etc.)
  attributes?: Record<string, string>; // Attributes as key-value pairs
  children?: (HTMLJSONNode | string)[]; // Child nodes (either HTMLNode or text)
};

export const addNativeElements = (selector: QuerySelector, htmlElement: HTMLJSONNode, attachType: AttachType = 'lastChild') => {
  const html = jsonToHtml(htmlElement);
  console.log('Adding HTML to', selector, 'with attachType', attachType, 'HTML:', html);
}

function jsonToHtml(json: HTMLJSONNode | string): string {
  if (!json || typeof json !== 'object') return '';
  if (typeof json === 'string') return json;

  const { tag, attributes = {}, children = [] } = json;

  const attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

  const childrenHtml = children.map(jsonToHtml).join('');

  return `<${tag}${attrs ? ' ' + attrs : ''}>${childrenHtml}</${tag}>`;
}