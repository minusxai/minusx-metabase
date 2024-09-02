import { test as base } from '../fixtures/jupyter'
import { JupyterNotebookState, RootState } from "web"
import { getMinusxState, initialiseMinusxState, runMinusxInstruction } from "./minusxState";
import { getAppStateActions, openMinusXFrame } from "./appState";
import * as fs from 'fs';
import * as path from 'path'
import { TestConfig } from '../fixtures/jupyter';
import { TestMod } from '../mods/types';
import { Frame, Page } from 'playwright/test';

export const TestRunner = (config: TestConfig) => {
  const { description, initialMinusxState, instruction, checks, file, init } = config
  const test = base.extend<{
    testConfig: TestConfig
  }>({
    testConfig: async ({}, use) => {
      await use({
        file,
        initialMinusxState
      })
    }
  })
  const expect = test.expect;
  test.setTimeout(60000)

  test.describe(description, async () => {
    let initialAppState: JupyterNotebookState;
    let finalAppState: JupyterNotebookState;
    let finalMinusxState: RootState;

    test.beforeAll(async ({ page, frame }) => {
      await runInitSequentially(init, frame, page);
      initialAppState = (await getAppStateActions(frame)).state;
      await runMinusxInstruction(frame, instruction)
      finalMinusxState = await getMinusxState(frame);
      finalAppState = (await getAppStateActions(frame)).state;
    })
    
    for (const [idx, check] of checks.entries()) {
      test(`Check: ${check.name}`, async () => {
        await check({
          instruction,
          initialMinusxState,
          initialAppState,
          finalMinusxState,
          finalAppState,
        }, expect)
      })
    }
  });
}

export function loadStateFromFile(filePath: string): RootState {
  const fileContent = fs.readFileSync(path.join(__dirname, `../data/${filePath}`), 'utf-8');
  return JSON.parse(fileContent) as RootState;
}

async function runInitSequentially(init: Array<TestMod>, frame: Frame, page: Page) {
  for (const mod of init) {
    await mod({ frame, page });
  }
}