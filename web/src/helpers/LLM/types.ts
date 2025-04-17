import { ChatCompletion, ChatCompletionMessageParam } from "openai/resources";
import { ToolCalls } from "../../state/chat/reducer";

export type LLMContext = Array<ChatCompletionMessageParam>
export type LLMResponse = {
  tool_calls: ToolCalls,
  content: string,
  finish_reason: ChatCompletion.Choice['finish_reason']
  // optional error message
  error?: string
  credits?: number
  tasks_key?: string
}
// Should add more stuff here as and when we try to experiment with them
export type LLMSettings = {
  model: string,
  temperature: number,
  // NOTE(@arpit): conflicting documentation - the python types specify as {type: string} but official docs
  // allow `string | {type: string}` (specifically response_format="auto"). I'm going with the latter for now
  response_format: {type: 'text' | 'json_object'},
  tool_choice: string,
}