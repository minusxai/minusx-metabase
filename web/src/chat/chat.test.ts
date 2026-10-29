import { getState } from '../state/store'
import chat from './chat'
// import planner from '../planner/planner'
// planner.init()

describe('Chat Messages', () => {
  it('should return the initial state of the chat reducer', () => {
    expect(getState().chat).toEqual({
      threads: [
        {
          id: 0,
          messages: [],
        },
      ],
      activeThread: 0,
    })
  })

  it('should handle addMessage action', async () => {
    const content = "Hello World"
    chat.addUserMessage({
      content,
      contentType: 'text',
      tabId: 'testing_tabId'
    })
    expect(getState().chat.threads[0].messages[0].sender).toEqual("user")
    expect(getState().chat.threads[0].messages[0].content).toEqual(content)
  })
})
