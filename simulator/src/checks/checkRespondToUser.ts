import { TestCheck } from "./types";

export const checkRespondToUser: TestCheck = ({ initialMinusxState, initialAppState, finalMinusxState, finalAppState }, expect) => {
    const activeThread = finalMinusxState.chat.activeThread
    const messages = finalMinusxState.chat.threads[activeThread].messages
    expect(messages.some(message =>
        (message.role == 'assistant' && message.content.messageContent.length > 0) ||
        (message.role == 'tool' && message.content.type == 'DEFAULT' && message.content.text.length > 0)
    )).toBe(true)
}
