import { Frame } from '@playwright/test';
import { test as base } from './base'

export const test = base.extend<{
    frame: Frame;
    url: string
}>({
  frame: async ({ page, url }, use) => {
    await page.goto(url);
    const minusxFrame = await (await page.$('#minusx-iframe'))?.contentFrame()
    if (!minusxFrame) {
        throw Error('minusxFrame not found')
    }
    await minusxFrame.evaluate('window.IS_PLAYWRIGHT = true;')
    await minusxFrame.waitForLoadState('load');
    await use(minusxFrame);
  },
});
export const expect = test.expect;