import { Frame } from "playwright/test";
import { RootState } from "web";

export const initialiseMinusxState = async (frame: Frame, state: RootState) => {
    await frame.evaluate(async (action) => {
        window.__DISPATCH__(action)
    }, {
        key: "root",
        type: "persist/REHYDRATE",
        payload: state
    });
}

export const getMinusxState = async (frame: Frame) => {
    const reduxState: RootState = await frame.evaluate(async (action) => {
        return window.__GET_STATE__()
    })
    return reduxState
}

type WaitingOptions = {
    timeout?: number,
    polling?: number,
}

const waitTillMinusxFinished = async (frame: Frame, options?: WaitingOptions) => {
    return await frame.waitForFunction(() => {
        const reduxState: RootState = window.__GET_STATE__()
        const activeThread = reduxState.chat.activeThread
        const currentThread = reduxState.chat.threads[activeThread]
        return currentThread.status === 'FINISHED'
      }, undefined, options)
}

export const runMinusxInstruction = async (frame: Frame, instruction: string, options?: WaitingOptions) => {
    await frame.getByLabel('Enter Instructions').fill(instruction)
    await frame.getByLabel('Done').click()
    await waitTillMinusxFinished(frame, {
        timeout: 40000,
        polling: 100,
        ...options
    })
}