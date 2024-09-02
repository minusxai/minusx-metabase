import { getParsedIframeInfo } from './origin';

export const getExtensionID = () => {
    const parsed = getParsedIframeInfo()
    return parsed.r
}