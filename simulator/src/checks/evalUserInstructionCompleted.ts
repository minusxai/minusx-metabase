import { LLMResponse, PlanActionsParams, ToolCalls } from "web";
import { TestCheck } from "./types";

export const evalUserInstructionCompleted: TestCheck = async ({ instruction, initialMinusxState, initialAppState, finalMinusxState, finalAppState }) => {
    const activeThread = finalMinusxState.chat.activeThread
    const messages = finalMinusxState.chat.threads[activeThread].messages
    const assistantResponse = messages.slice(1)
    const evalPrompt = `
        <InitialJupyterAppState>
        ${JSON.stringify(initialAppState)}
        </InitialJupyterAppState>

        <UserInstruction>
        ${instruction}
        </UserInstruction>

        <FinalJupyterAppState>
        ${JSON.stringify(finalAppState)}
        </FinalJupyterAppState>

        <AssistantResponse>
        Sorry couldn't complete
        </AssistantResponse`
    const planActionsParams: PlanActionsParams = {
        messages: [{
            role: 'system',
            content: `You are an expert judge of LLMs. Please judge if the user instruction is fulfilled.
            Use the 'judge' tool call to determine if the user instruction is fulfilled. Only respond with the tool call.`
        }, {
            role: 'user',
            content: evalPrompt
        }],
        actions: [
            {
                name: 'judge',
                args: {
                    userInstructionFulfilled: {
                        type: 'boolean',
                        description: "'true' if the user's instruction is fulfilled. Otherwise false."
                    },
                },
                description: 'judges if user instruction is accomplished.',
                required: ['userInstructionFulfilled']
            }
        ],
        llmSettings: {
            model: "claude-3-5-sonnet-20240620",
            temperature: 0,
            response_format: {type: "json_object"},
            tool_choice: "auto"
        },
        signal: new AbortController().signal,
    }
    try {
        const llmResponse = await planActionsRemote(planActionsParams)
        console.log('LLM Response is', llmResponse)
        const result = JSON.parse(llmResponse.tool_calls[0].function.arguments)
        return result.userInstructionFulfilled
    } catch (err) {
        console.log('Error is', err)
        return false
    }
}

const url = 'http://localhost:8000/planner/getLLMResponse'

async function planActionsRemote({
    messages,
    actions,
    llmSettings,
    signal,
}: PlanActionsParams): Promise<LLMResponse> {
    const payload = {
        messages,
        actions,
        llmSettings,
    }
    const response = await fetch(url, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal
    })
    // throw error if aborted
    signal.throwIfAborted();
    if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`)
    }

    const jsonResponse = await response.json()
    if (jsonResponse.error) {
        throw new Error(jsonResponse.error)
    }
    return { tool_calls: jsonResponse.tool_calls as ToolCalls, finish_reason: jsonResponse.finish_reason, content: jsonResponse.content }
}