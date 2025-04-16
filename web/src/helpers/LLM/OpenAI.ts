import _ from 'lodash'
import OpenAI from 'openai'
import { ChatCompletion, ChatCompletionTool, ChatCompletionMessageParam, ChatCompletionToolChoiceOption } from 'openai/resources'
import { getState } from '../../state/store'
import { FAKE_GPT4_RESPONSE, MOCK_COMPLETION_1 } from '../mockResponses'
import { sleep } from '../utils'

import chat from "../../chat/chat"
import { ToolCalls } from '../../state/chat/reducer'
import { LLMResponse, LLMSettings } from './types'
import { PlanActionsParams } from '.'

async function getOpenAIRawResponse({
  messages,
  actions,
  llmSettings,
  signal
}: PlanActionsParams): Promise<LLMResponse> {
  const { apiKey, baseURL } = getState().settings
  const openai = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  })
  const tools: Array<ChatCompletionTool> = _.map(actions, ({ description, name, args }) => ({
    type: 'function',
    function: {
      description,
      name,
      parameters: {
        type: 'object',
        properties: args,
      },
    },
  }))
  console.log('Input Entire Prompt is', messages, tools)
  // const completion = MOCK_COMPLETION_1
  // const completion = FAKE_GPT4_RESPONSE
  const completion = await openai.chat.completions.create({
    model: llmSettings.model || 'gpt-4.1',
    messages,
    // max_tokens: 4000,
    temperature: llmSettings.temperature || 0,
    response_format: llmSettings.response_format ||  { type: 'json_object' },
    tool_choice: llmSettings.tool_choice as ChatCompletionToolChoiceOption || 'required',
    tools,
  }, {
    signal
  })
  // throw error if aborted
  signal.throwIfAborted();
  console.log('Completion is', completion)
  if (! (completion as ChatCompletion).choices[0].message.tool_calls ) {
    throw new Error("No tool calls in completion response")
  }
  return {tool_calls: (completion as ChatCompletion).choices[0].message.tool_calls || [], finish_reason: (completion as ChatCompletion).choices[0].finish_reason}
  
}

export async function planActionsOpenAI(params: PlanActionsParams) : Promise<LLMResponse> { 
  const response = await getOpenAIRawResponse(params)
  console.log('LLM Response is', response)
  return response
}
