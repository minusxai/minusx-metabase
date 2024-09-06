import chat from "../chat/chat";
import { DefaultMessageContent } from '../state/chat/types'
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import _ from "lodash"
import { getApp } from "../helpers/app";

export async function useAppFromExternal({text}: {text: string}) {
  const content: DefaultMessageContent = {
    type: "DEFAULT",
    text: text,
    images: []
  }

  chat.addUserMessage({content})
  while (true){
    await sleep(2000) // hack to avoid race condition
    const state = getState()
    const thread = state.chat.activeThread
    const threadStatus = state.chat.threads[thread].status
    if (threadStatus === "FINISHED") {
      console.log("Thread finished!")
      break;
    }
    console.log(threadStatus)
    await sleep(100)
  }
  const outputImgs = [await getApp().actionController.getOutputAsImage()] || []
  const outputText = await getApp().actionController.getOutputAsText() || ''

  return {
    type: "DEFAULT",
    text: outputText,
    images: outputImgs
  }
}