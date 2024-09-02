
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
  appState: AppState,
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
    state: JSON.stringify(appState),
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