import chat from "../chat/chat";
import { DefaultMessageContent } from '../state/chat/types'
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import _, { isEmpty } from "lodash"
import { getMetaPlan } from "../helpers/LLM/remote";

export async function metaPlanner({text}: {text: string}) {
  
  let steps = await getMetaPlan(text)

  steps.reverse()
  while (!isEmpty(steps)) {
    const step = steps.pop()
    const content: DefaultMessageContent = {
      type: "DEFAULT",
      //@ts-ignore
      text: step, 
      images: []
    }
    chat.addUserMessage({content})
    while (true) {
      await sleep(1000)
      const state = getState()
      const thread = state.chat.activeThread
      const threadStatus = state.chat.threads[thread].status
      if (threadStatus === "FINISHED") {
        console.log("Thread finished!")
        break;
      }
      console.log(threadStatus)
    }
  }
}