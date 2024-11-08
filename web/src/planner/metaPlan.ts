import chat from "../chat/chat";
import { DefaultMessageContent } from '../state/chat/types'
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import _, { isEmpty } from "lodash"
import { getMetaPlan } from "../helpers/LLM/remote";

export async function metaPlanner({text}: {text: string}) {
  
  let steps = await getMetaPlan(text, [])
  console.log('Initial steps are', steps)

  while (!isEmpty(steps)) {
    const step = steps.shift()
    const content: DefaultMessageContent = {
      type: "DEFAULT",
      //@ts-ignore
      text: step, 
      images: []
    }
    chat.addUserMessage({content})
    let shouldContinue = true
    while (true) {
      await sleep(500)
      const state = getState()
      const thread = state.chat.activeThread
      const threadStatus = state.chat.threads[thread].status
      const isInterrupted = state.chat.threads[thread].interrupted
      if (isInterrupted) {
        shouldContinue = false
        break;
      }
      if (threadStatus === "FINISHED") {
        console.log("Thread finished!")
        break;
      }
      console.log(threadStatus)
    }
    if (!shouldContinue) {
      break;
    }
    const newSteps = await getMetaPlan(text, steps)
    if (!isEmpty(newSteps)) {
      steps = newSteps
    }
    console.log('New steps are', steps)
  }
}