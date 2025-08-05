import { DOMQueryMapResponse } from "extension/types";
import { isDashboardPageUrl } from "./dashboard/util";
import { isMBQLPageUrl } from "./mbql/utils";

export const isQuestionPageUrl = (url: string) => {
  return url.includes('/question');
}

export const isModelPageUrl = (url: string) => {
  return url.includes('/model');
}

export type MetabasePageType = 'sql' | 'dashboard' | 'mbql' | 'unknown';


export function determineMetabasePageType(elements: DOMQueryMapResponse, url: string, queryType: string): MetabasePageType {
    console.log('determineMetabasePageType', { url, queryType, })
    if (isDashboardPageUrl(url)) {
        return 'dashboard';
    }
    if (isMBQLPageUrl(url)) {
        return 'mbql';
    }
    if (isModelPageUrl(url) && queryType === 'query') {
        return 'mbql'
    }
    if (isModelPageUrl(url) && queryType === 'native') {
        return 'sql';
    }
    if (isQuestionPageUrl(url) && queryType === 'query') {
        return 'mbql';
    }
    if (isQuestionPageUrl(url) && queryType === 'native') {
        return 'sql';
    }
    // if (elements.editor && !isEmpty(elements.editor)) {
    //     return 'sql';
    // }
    // if (elements.mbql && (!isEmpty(elements.mbql) || !isEmpty(elements.mbql_embedded))) {
    //     return 'mbql';
    // }
    return 'unknown';
}