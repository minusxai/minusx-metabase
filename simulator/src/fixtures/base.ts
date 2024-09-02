import { test as base, chromium, type BrowserContext } from '@playwright/test';
import * as path from 'path'

export const test = base.extend<{
  context: BrowserContext;
//   extensionId: string;
}>({
  context: async ({ }, use) => {
    const isHeadless = process.env.HEADLESS == 'true';
    const pathToExtension = path.join(__dirname, '../../../extension/build');
    const browserContextArgs = [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ]
    if (isHeadless) {
      browserContextArgs.push("--headless=new")
    }
    const context = await chromium.launchPersistentContext('', {
      headless: isHeadless,
      args: browserContextArgs,
    });
    await use(context);
    await context.close();
  },
});
export const expect = test.expect;