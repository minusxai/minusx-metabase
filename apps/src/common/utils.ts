import { get } from 'lodash';

export function getWithWarning(object, path, defaultValue) {
  const result = get(object, path, defaultValue);
  if (result === undefined) {
    console.warn(`Warning: Property at path "${path}" not found.`);
  }
  return result;
}

export async function sleep(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
