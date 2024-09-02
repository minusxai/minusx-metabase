import { getElementsFromQuerySelector } from "../../helpers/pageParse/getElements"
import { QuerySelector } from "../../helpers/pageParse/querySelectorTypes"
import { domToDataUrl } from 'modern-screenshot'

export async function getElementScreenCapture(querySelector: QuerySelector): Promise<string[]> {
    const elements = getElementsFromQuerySelector(querySelector)
    return await Promise.all(elements.map(element => domToDataUrl(element)))
}
