import { test as base } from './frame'
import { constants } from '../utils/constants';
import { RootState } from 'web';
import { initialiseMinusxState } from '../utils/minusxState';
import { openMinusXFrame } from '../utils/appState';
import { TestMod } from '../mods/types';
import { TestCheck } from '../checks/types';
// import fs from 'fs'

export interface TestConfig {
  description: string,
  file: string,
  initialMinusxState: RootState,
  init: Array<TestMod>,
  instruction: string,
  checks: Array<TestCheck>
}


export const test = base.extend<{
  testConfig: Pick<TestConfig, 'file' | 'initialMinusxState'>,
}>({
  url: async ({ testConfig }, use) => {
    const { file } = testConfig
    const url = `${constants.JUPYTER_SERVER_PATH}/${file}?token=${constants.JUPYTER_TOKEN}`
    await use(url)
  },
  frame: async ({ page, frame, testConfig }, use) => {
    const { initialMinusxState } = testConfig
    await Promise.all([
      (async () => {
        try {
          await page.getByTitle('Hide notification').click();
        } catch (e) {}
      })(),
      initialiseMinusxState(frame, initialMinusxState),
    ])
    await openMinusXFrame(page)
    use(frame)
  },
  // Allows caching of fixture between runs
  // storageState: async ({ page, frame }, use) => {
  //   const stateFile = '.playwright/initialState.json'
  //   if (fs.existsSync(stateFile)) {
  //     use(stateFile)
  //   }
  //   await page.context().storageState({ path: stateFile });
  //   await use(stateFile);
  // },
});
export const expect = test.expect;