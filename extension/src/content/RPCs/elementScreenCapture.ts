import { getElementsFromQuerySelector } from "../../helpers/pageParse/getElements"
import { QuerySelector } from "../../helpers/pageParse/querySelectorTypes"
import { domToDataUrl } from 'modern-screenshot'

// frickign copy paste
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

export async function getElementScreenCapture(querySelector: QuerySelector): Promise<string[]> {
    const elements = getElementsFromQuerySelector(querySelector)
    const images = []
    for (const element of elements) {
        await scrollElementIntoView(element)
        images.push(await domToDataUrl(element))
    }
    return images
}
