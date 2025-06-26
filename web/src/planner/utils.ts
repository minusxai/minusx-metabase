
import { LLMContext, LLMContextWithMeta } from '../helpers/LLM/types';
import { ChatMessage, UserChatMessage } from '../state/chat/reducer';
import { renderString } from '../helpers/templatize';
import { formatLLMMessageHistory } from '../helpers/LLM/context';
import _ from 'lodash';
import { AppState } from 'apps/types';
import { getState } from '../state/store';


type LLMPrompts = {
  system: string,
  user: string,
}
export function getLLMContextFromState(
  prompts: LLMPrompts,
  userAppState: AppState,
  currentAppState: AppState,
  messageHistory: ChatMessage[]): LLMContextWithMeta {
  // search backwards for the index of the last user message
  const lastUserMessageIdx = messageHistory.findLastIndex((message) => message.role === 'user')
  if (lastUserMessageIdx === -1) {
    throw new Error('No user message found')
  }
  const earlierMessages = messageHistory.slice(0, lastUserMessageIdx)
  const lastUserMessage = messageHistory[lastUserMessageIdx] as UserChatMessage
  const furtherMessages = messageHistory.slice(lastUserMessageIdx + 1)

  // Calculate time delta between current message and previous message
  let timeDelta = 0;
  let threadTimeDelta: number | undefined = undefined;
  
  if (lastUserMessageIdx > 0) {
    const previousMessage = messageHistory[lastUserMessageIdx - 1];
    timeDelta = lastUserMessage.createdAt - previousMessage.createdAt;
  } else {
    // If no previous messages in current thread, check previous thread
    const state = getState();
    const currentThreadIndex = state.chat.activeThread;
    
    if (currentThreadIndex > 0) {
      const previousThread = state.chat.threads[currentThreadIndex - 1];
      if (previousThread && previousThread.messages.length > 0) {
        // Find the last user message in the previous thread
        const lastUserMessageIdx = previousThread.messages.findLastIndex(msg => msg.role === 'user');
        const lastUserMessageInPrevThread = lastUserMessageIdx >= 0 ? previousThread.messages[lastUserMessageIdx] : null;
        
        if (lastUserMessageInPrevThread) {
          threadTimeDelta = lastUserMessage.createdAt - lastUserMessageInPrevThread.createdAt;
        }
      }
    }
  }

  const promptContext = {
    state: JSON.stringify(userAppState),
    aiRules: (getState().settings.useMemory ? getState().settings.aiRules : "no special instructions.") || "no special instructions.",
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

  // if (furtherMessages.length != 0) {
  //   const latestMessage = structuredClone(furtherMessages[furtherMessages.length - 1])
  //   if (latestMessage.content.type == 'BLANK') {
  //     let content = latestMessage.content.content
  //     try {
  //       if (content) {
  //         content = JSON.parse(content)
  //       }
  //     } catch (e) {
  //       // do nothing
  //     }
  //     latestMessage.content.content = JSON.stringify({
  //       content: content || '',
  //       currentAppState
  //     })
  //   } else if (latestMessage.content.type == 'DEFAULT') {
  //     latestMessage.content.text = JSON.stringify({
  //       content: latestMessage.content.text || '',
  //       currentAppState
  //     })
  //   }
  //   furtherMessages[furtherMessages.length - 1] = latestMessage
  // }
  earlierMessages.push(finalUserMessage)
  // add furtherMessages to earlierMessages
  earlierMessages.push(...furtherMessages)
  const context = formatLLMMessageHistory(earlierMessages)
  // if (!finalUserMessage.content.text.toLowerCase().includes("json")) {
  //   debugger;
  // }
  
  const llmContext: LLMContext = [
    {
      role: 'system',
      content: systemMessage,
    },
    ...context,
  ];

  const meta: { timeDelta: number; threadTimeDelta?: number } = {
    timeDelta
  };
  
  if (threadTimeDelta !== undefined) {
    meta.threadTimeDelta = threadTimeDelta;
  }

  return {
    context: llmContext,
    meta
  };
}