import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { fireEvent } from '@testing-library/dom';
import { QuerySelector } from '../../helpers/pageParse/querySelectorTypes';
import { getElementFromQuerySelector, getElementsFromQuerySelector } from '../../helpers/pageParse/getElements';
import { sleep } from '../../helpers/utils';

// #HACK to implement highlight
type Style = Partial<HTMLEmbedElement["style"]>
type OldElements = {
    element?: HTMLElement,
    style: Style
}
const OLD_ELEMENTS: OldElements = {
  style: {}
}

const highlightElement = (newElement: HTMLElement, newStyle: Style) => {
  // Set element style to new style
  const oldStyle: Style = {}
  for (const styleKey in newStyle) {
    if (newStyle[styleKey]) {
      oldStyle[styleKey] = newElement.style[styleKey]
      newElement.style[styleKey] = newStyle[styleKey]
    }
  }
  console.log('Old element style saved', oldStyle)
  console.log('New element style set', newStyle)
  if (OLD_ELEMENTS.element) {
    // Restore old element
    const {style: oldStyle, element: oldElement } = OLD_ELEMENTS
    for (const styleKey in oldStyle) {
      if (oldStyle[styleKey] !== undefined) {
        oldElement.style[styleKey] = oldStyle[styleKey]
      }
    }
    console.log('Old element style restored', oldStyle)
  }
  if (OLD_ELEMENTS.element === newElement) {
    OLD_ELEMENTS.element = undefined
    OLD_ELEMENTS.style = {}
    console.log('Old Element style removed')
  } else {
    OLD_ELEMENTS.element = newElement
    OLD_ELEMENTS.style = oldStyle
    console.log('Old element style saved', OLD_ELEMENTS.style)
  }
}

export const scrollIntoView = async (selector: QuerySelector, index: number = 0) => {
  const element = getElementFromQuerySelector(selector, index);
  console.log('Scrolling into view', element, selector, index)
  if (element) {
    await scrollElementIntoView(element)
  }
}

const scrollElementIntoView = async (element: Element) => {
  if (element.style?.display === 'none') {
    element.style.display = 'block';
  }
  const MAX_ATTEMPTS = 10;
  const THRESHOLD = 10;
  const WAIT_TIME = 200;

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const initialY = element.getBoundingClientRect().top;
    if (initialY >= 0 && initialY < window.innerHeight) {
      console.log('Element already in view');
      break;
    }

    element.scrollIntoView({
      block: 'center',
      inline: 'center',
    });

    await wait(WAIT_TIME);
    const newY = element.getBoundingClientRect().top;

    if (Math.abs(newY - initialY) < THRESHOLD) {
      console.log('Scroll position stabilized');
      break;
    }

    if (i === MAX_ATTEMPTS - 1) {
      console.log('Max scroll attempts reached');
    }
  }
};

export const dropText = async (textToDrop: string, element: Element) => {
  const dataTransfer = new DataTransfer();
  dataTransfer.clearData()
  dataTransfer.setData('text/plain', textToDrop);

  fireEvent.dragEnter(element, { dataTransfer });
  fireEvent.dragOver(element, { dataTransfer });
  fireEvent.drop(element, { dataTransfer });
}

export const uClick = async (selector: QuerySelector, index: number = 0) => {
  const user = userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.EachTrigger
  })
  const element = getElementFromQuerySelector(selector, index);
  if (element) {
    return await user.click(element)
  }
}

export const uDblClick = async (selector: QuerySelector, index: number = 0) => {
  const user = userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.EachTrigger
  })
  const element = getElementFromQuerySelector(selector, index);
  if (element) {
    return await user.dblClick(element)
  }
}


export const uSelectAllText = async (shouldDelete = false) => {
    await document.execCommand('selectall', null, false)
    if (shouldDelete) {
        await document.execCommand('delete', null, false)
    }
}

export const typeText = async (selector: QuerySelector, value: string = '', index: number = 0) => {
  const user = userEvent.setup({
    pointerEventsCheck: PointerEventsCheckLevel.EachTrigger
  })
  const element = getElementFromQuerySelector(selector, index);
  if (element) {
    console.log('Setting value', element, selector, value, index)
    await user.keyboard(value)
  }
}

export const dragAndDropText = async (selector: QuerySelector, value: string = '', index: number = 0) => {
  const element = getElementFromQuerySelector(selector, index);
  if (element) {
    console.log('Setting value instantly', element, selector, value, index)
    await dropText(value, element)
  }
}

export const uHighlight = async (selector: QuerySelector, index: number = 0, newStyles?: Partial<HTMLEmbedElement["style"]>) => {
  const element = getElementFromQuerySelector(selector, index);
  if (element) {
    if (!newStyles) {
      newStyles = {
        border: "red 1px solid"
      }
    }
    highlightElement(element as HTMLElement, newStyles)
  }
}