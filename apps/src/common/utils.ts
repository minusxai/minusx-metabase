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
    console.error(err)
    return defaultReturn
  }
}

interface TaskStatus {
  status: 'running' | 'cancelled' | 'finished'
}
type TaskToRun = (t: TaskStatus) => Promise<void>;

export function createRunner() {
  let nextTask: (TaskToRun) | null = null;
  const taskStatus: TaskStatus = { status: 'finished' }

  async function run(task: TaskToRun): Promise<void> {
    if (taskStatus.status !== 'finished') {
      nextTask = task;
      taskStatus.status = 'cancelled'
      return;
    }
    
    let currentTask: TaskToRun | null = task;
    while (currentTask) {
      taskStatus.status = 'running';
      try {
        await currentTask(taskStatus);
      } finally {
        taskStatus.status = 'finished';
        currentTask = nextTask;
        nextTask = null;
      }
    }
  }

  return run;
}

export function abortable<T>(promise: Promise<T>, isAborted: () => boolean): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const checkAbort = () => {
      if (isAborted()) {
        reject(new Error('Aborted due to status change'));
      }
    };

    const interval = setInterval(checkAbort, 100); // Poll every 100ms

    promise.then((result) => {
      clearInterval(interval);
      resolve(result);
    }).catch((err) => {
      clearInterval(interval);
      reject(err);
    });

    checkAbort(); // in case it was already aborted
  });
}

export const applyTableDiffs = (allTables: FormattedTable[], tableDiff: TableDiff, dbId: number, sqlTables: TableAndSchema[] = [], mbqlTableIds: number[] = []) => {
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
    ) || mbqlTableIds.includes(table.id)
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