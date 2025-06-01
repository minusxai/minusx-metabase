import { isEqual, some } from "lodash";

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