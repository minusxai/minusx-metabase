
import { LLMContext } from '../helpers/LLM/types';
import { ChatMessage, UserChatMessage } from '../state/chat/reducer';
import { renderString } from '../helpers/templatize';
import { formatLLMMessageHistory } from '../helpers/LLM/context';
import _ from 'lodash';
import { AppState } from 'apps/types';


type LLMPrompts = {
  system: string,
  user: string,
}
export function getLLMContextFromState(
  prompts: LLMPrompts,
  userAppState: AppState,
  currentAppState: AppState,
  messageHistory: ChatMessage[]): LLMContext {
  // search backwards for the index of the last user message
  const lastUserMessageIdx = messageHistory.findLastIndex((message) => message.role === 'user')
  if (lastUserMessageIdx === -1) {
    throw new Error('No user message found')
  }
  const earlierMessages = messageHistory.slice(0, lastUserMessageIdx)
  const lastUserMessage = messageHistory[lastUserMessageIdx] as UserChatMessage
  const furtherMessages = messageHistory.slice(lastUserMessageIdx + 1)

  const promptContext = {
    state: JSON.stringify(userAppState),
    instructions: lastUserMessage.content.text
  }
  const systemMessage = renderString(prompts.system, promptContext);

  const prompt = renderString(prompts.user, promptContext);
  const finalUserMessage: UserChatMessage = {
    ...lastUserMessage,
    content: {
      ...lastUserMessage.content,
      text: prompt
    }
  }

  if (furtherMessages.length != 0) {
    const latestMessage = structuredClone(furtherMessages[furtherMessages.length - 1])
    if (latestMessage.content.type == 'BLANK') {
      let content = latestMessage.content.content
      try {
        if (content) {
          content = JSON.parse(content)
        }
      } catch (e) {
        // do nothing
      }
      latestMessage.content.content = JSON.stringify({
        content: content || '',
        currentAppState
      })
    } else if (latestMessage.content.type == 'DEFAULT') {
      latestMessage.content.text = JSON.stringify({
        content: latestMessage.content.text || '',
        currentAppState
      })
    }
    furtherMessages[furtherMessages.length - 1] = latestMessage
  }
  earlierMessages.push(finalUserMessage)
  // add furtherMessages to earlierMessages
  earlierMessages.push(...furtherMessages)
  const context = formatLLMMessageHistory(earlierMessages)
  // if (!finalUserMessage.content.text.toLowerCase().includes("json")) {
  //   debugger;
  // }
  return [
    {
      role: 'system',
      content: systemMessage,
    },
    ...context,
  ]
}