import { ChatCompletionContentPartImage, ChatCompletionMessageToolCall, ChatCompletionToolMessageParam } from "openai/resources"
import { ChatMessage } from "../../state/chat/reducer"
import { LLMContext } from "./types"

export function formatLLMMessageHistory(messages: ChatMessage[]): LLMContext {
  const llmContext: LLMContext = []
  for (const message of messages) { 
    if (message.role == 'user') {
      const content = message.content
      if (content.images.length == 0) {
        llmContext.push({
          role: 'user',
          content: content.text
        })
      } else {
        const imageContent: ChatCompletionContentPartImage[] = []
        for (const image of content.images) {
          imageContent.push({
            type: 'image_url',
            image_url: {
              url: image.url
            }
          })
        }
        llmContext.push({
          role: 'user',
          content: [
            ...imageContent,
            {
              type: 'text',
              text: content.text
            }
          ]
        })
      }
    } else if (message.role == 'assistant') {
      const content = message.content
      if (content.type == 'ACTIONS') {
        const tool_calls: ChatCompletionMessageToolCall[] = content.toolCalls
        const messageContent: string = content.messageContent
        // only keep tool_calls if they are not empty
        if (tool_calls.length > 0) {
          llmContext.push({
            role: 'assistant',
            tool_calls,
            content: messageContent
          })
        } else {
          llmContext.push({
            role: 'assistant',
            content: messageContent
          })
        }
      } 
    } else { // role is tool
      const content = message.content
      if (content.type == 'DEFAULT') {
        llmContext.push({
          role: 'tool',
          tool_call_id: message.action.id,
          content: content.text
        })
      }
      else {
        let content: string = message.action.status
        if (message.content.type == 'BLANK') {
          content = message.content.content || ''
        }
        llmContext.push({
          role: 'tool',
          tool_call_id: message.action.id,
          // content: message.action.status
          content
        })
      }
    }
  }
  return llmContext
}