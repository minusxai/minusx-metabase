import { isEqual, some } from "lodash";
import { getApp } from "./app";
import { EmbedConfigs } from "../state/configs/reducer";
import { getParsedIframeInfo } from "./origin";

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


export const processModelToUIText = (text: string, origin: string, embedConfigs: EmbedConfigs = {}): string => {
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
        // Replace [card_id:<id>] with markdown link using embed URL logic
        text = text.replace(/\[card_id:(\d+)\]/g, (match, id) => {
            const isEmbedded = getParsedIframeInfo().isEmbedded as unknown === 'true';
            const embedHost = embedConfigs.embed_host;
            
            let questionUrl;
            if (embedHost && isEmbedded) {
                // Use embed host for embedded mode
                questionUrl = `${embedHost}/question/${id}`;
            } else {
                // Use regular origin
                questionUrl = `${origin}/question/${id}`;
            }
            
            return `[Card ID: ${id}](${questionUrl})`;
        });
    }
    if (text.includes("<OUTPUT>")) {
        const match = text.match(/<OUTPUT>(.*?)<\/OUTPUT>/s);
        if (match) {
            text = match[1];
        }
        if (text.includes("---")) {
            return text;
        }
        return '';
    }
    if (text.includes("<ERROR>")) {
        const match = text.match(/<ERROR>(.*?)<\/ERROR>/s);
        if (match) {
            text = match[1];
        }
        const truncated = text.length > 100 ? text.slice(0, 100) + '...' : text;
        return `> Error: ${truncated}.\n\nFixing it!`;
    }
    if (text.includes("<UserCancelled>")) {
        const match = text.match(/<UserCancelled>(.*?)<\/UserCancelled>/s);
        if (match) {
            text = match[1];
        }
        return `> User Cancellation ${text}.`;
    }
    return text
}