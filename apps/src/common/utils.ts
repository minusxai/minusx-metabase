import { get } from 'lodash';
import { FormattedTable } from '../metabase/helpers/types';
import { TableDiff } from 'web/types';

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

export const applyTableDiffs = (tables: FormattedTable[], allTables: FormattedTable[], tableDiff: TableDiff[]) => {
  const tablesToRemove = tableDiff
    .filter((diff: TableDiff) => diff.action === 'remove')
    .map((diff: TableDiff) => diff.table)

  const tablesToAdd = tableDiff
    .filter((diff: TableDiff) => diff.action === 'add')
    .map((diff: TableDiff) => diff.table);

  const filteredRelevantTables = tables.filter(
    table => !tablesToRemove.includes(table.name)
  );

  const tablesToAppend = allTables.filter(
    table => tablesToAdd.includes(table.name)
  );

  const updatedRelevantTables = [...filteredRelevantTables];

  tablesToAppend.forEach(table => {
    if (!updatedRelevantTables.some(existing => existing.name === table.name)) {
      updatedRelevantTables.push(table);
    }
  });

  return updatedRelevantTables;
}