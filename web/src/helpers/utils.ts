import { isEqual, some } from "lodash";
import { getApp } from "./app";

export async function sleep(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truthyFilter<T>(value: T | null | undefined): value is T {
  return Boolean(value);
}

export type Subset<T, K extends T> = K;

export type Promisify<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;


const PLATFORM_LANGUAGES: {
  [key: string]: string
} = {
  jupyter: 'python',
  metabase: 'sql',
  google: 'javascript'
}

export const getPlatformLanguage = (platform: string): string => {
  return PLATFORM_LANGUAGES[platform] || 'python'
}

export function contains<T>(collection: T[], item: T): boolean {
  return some(collection, (i) => isEqual(i, item));
}

export const getUniqueString = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export interface ContextCatalog {
  type: 'manual' | 'aiGenerated'
  id: string
  name: string
  content: any
  dbName: string
  dbId: number
  origin: string
  allowWrite: boolean
  owner?: string
}

export type MxModel = {
  name: string
  id: number
  database_id: number
  dataset_query: {
    database: number,
    type: "native",
    native: {
      query: string
      "template-tags": {}
    }
  }
}

const controller = getApp().actionController
export const getActionTaskLiteLabels = (action: string) => {
    const extraMapping: { [key: string]: string } = {
        'UpdateTaskStatus': 'All done!',
        'MetabaseSimpleAgent': 'Spin up Metabase Agent',
        'MetabaseLowLevelAgent': 'Kick off SQL',
        'MetabaseMBQLAgent': 'Construct MBQL Query',
        'MetabaseDashboardAgent': 'Investigate Dashboard',
        'MetabaseAnalystAgent': 'Initialize Analyst Agent',
    }
    let taskString = ''



    if (controller) {
        const metadata = Reflect.getMetadata('actionMetadata', controller, action);
        if (metadata) {
            taskString = metadata['labelTask'] || metadata['labelDone'];
        }
    }
    return taskString || extraMapping[action] || action;
}


export const processModelToUIText = (text: string, origin: string): string => {
    if (text === ''){
        return ''
    }
    if (text.includes("[badge_mx]")) {
        // Replace [[badge_mx]Text] with `[badge_mx]Text`
        text = text.replace(/\[\[badge_mx\](.*?)\]/g, '`[badge_mx]$1`')
                   .replace(/\[\[badge_mx\]/g, '`[badge_mx]`')
                   .replace(/\]\]/g, '`]')  
    }
    if (text.includes("card_id:") && (origin != '')) {
        //Replace [card_id:<id>] with link
        // Replace [card_id:<id>] with markdown link
        text = text.replace(/\[card_id:(\d+)\]/g, (match, id) => {
            return `[Card ID: ${id}](${origin}/question/${id})`;
        });
    }
    return text
}