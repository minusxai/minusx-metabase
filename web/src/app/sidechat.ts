import chat from "../chat/chat";
import { DefaultMessageContent } from '../state/chat/types'
import { getState } from "../state/store"
import { sleep } from "../helpers/utils"
import _, { last } from "lodash"

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
  const state = getState()
  const thread = state.chat.activeThread
  const messages = state.chat.threads[thread].messages

  const lastTalkToUserCall = _.chain(messages)
  .flatMap(message => _.get(message, 'content.toolCalls', []))
  .filter(toolCall => toolCall.function.name === 'talkToUser')
  .last()
  .value();

  console.log("Last talkToUser", lastTalkToUserCall)
  return lastTalkToUserCall?.function?.arguments;
}