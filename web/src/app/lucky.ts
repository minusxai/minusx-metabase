import chat from "../chat/chat";
import { DefaultMessageContent } from '../state/chat/types'
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import _ from "lodash"
import { getApp } from "../helpers/app";
import { getMetaPlan } from "../helpers/LLM/remote";

export async function feelinLucky({text}: {text: string}) {
  
  const steps = await getMetaPlan(text)
  

  console.log(steps, "steps")
  for (const step of steps) {
    const content: DefaultMessageContent = {
      type: "DEFAULT",
      text: step,
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
  }
}