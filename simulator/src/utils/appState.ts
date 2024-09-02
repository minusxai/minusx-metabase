import { Frame, Page } from "playwright/test"

export const getAppStateActions = async (frame: Frame) => await frame.evaluate(async () => {
  return await window.__GET_STATE_ACTION__()
})

export const checkMinusXMode = async (page: Page, mode: string) => await page.evaluate((mode) => {
  return document.getElementById('minusx-root')?.className.includes(mode)
}, mode)

export const openMinusXFrame = async (page: Page) => {
  const isClosed = await checkMinusXMode(page, 'closed')
  if (isClosed) {
    await page.locator('#minusx-toggle').click()
  }
}

export const runAppActions = async (frame: Frame, fn: string, args: unknown) => await frame.evaluate(async ({fn, args}) => {
  await window.__EXECUTE_ACTION__({
      index: 0,
      function:fn,
      args: args
  })
}, {fn, args})