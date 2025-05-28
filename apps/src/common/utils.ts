import _, { get, isEqual, some } from 'lodash';
import { FormattedTable } from '../metabase/helpers/types';
import { TableDiff } from 'web/types';
import { contains } from 'web';
import { TableAndSchema } from '../metabase/helpers/parseSql';

export function getWithWarning(object: any, path: string, defaultValue: any) {
  const result = get(object, path, defaultValue);
  if (result === undefined) {
    console.warn(`Warning: Property at path "${path}" not found.`);
  }
  return result;
}

export async function sleep(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function escapeKeyboardCharacters(text: string) {
  // replace [ with [[,  { with {{, 
  return text.replace(/\[/g, '[[').replace(/\{/g, '{{');
}

export async function handlePromise<T> (promise: Promise<T>, errMessage: string, defaultReturn: T): Promise<T> {
  try {
    return await promise
  } catch (err) {
    console.error(errMessage);
    return defaultReturn
  }
}

export function createRunner() {
  let running = false;
  let nextTask: (() => Promise<void>) | null = null;

  async function run(task: () => Promise<void>): Promise<void> {
    if (running) {
      nextTask = task;
      return;
    }
    running = true;
    try {
      await task();
    } finally {
      running = false;
      if (nextTask) {
        const taskToRun = nextTask;
        nextTask = null;
        await run(taskToRun);
      }
    }
  }

  return run;
}

export const applyTableDiffs = (allTables: FormattedTable[], tableDiff: TableDiff, dbId: number, sqlTables: TableAndSchema[] = []) => {
  const updatedRelevantTables = allTables.filter(
    table => contains(tableDiff.add, {
      name: table.name,
      schema: table.schema,
      dbId,
    }) || sqlTables.some(
      sqlTable => isEqual({
        name: sqlTable.name,
        schema: sqlTable.schema,
      }, {
        name: table.name,
        schema: table.schema,
      })
    )
  );

  return updatedRelevantTables;
}

// Simple deterministic sampling function using string seed
export function deterministicSample<T>(array: T[], size: number, seed: string): T[] {
  if (array.length <= size) return array;
  
  // Simple hash function for seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create a copy and shuffle deterministically using Fisher-Yates algorithm
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use linear congruential generator for deterministic "random" index
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const j = hash % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, size);
}