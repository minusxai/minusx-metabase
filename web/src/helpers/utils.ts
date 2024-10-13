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