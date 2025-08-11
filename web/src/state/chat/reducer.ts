import { createSlice, createAction } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import _, { get } from 'lodash'

import { ChatCompletionMessageToolCall, ChatCompletionRole, ChatCompletionToolMessageParam, ChatCompletion, Chat } from 'openai/resources';
import { getUniqueString, Subset } from '../../helpers/utils'
import { LLMResponse } from '../../helpers/LLM/types';
import { ActionRenderInfo, BlankMessageContent, ChatMessageContentType, DefaultMessageContent } from './types';
import { getParsedIframeInfo } from '../../helpers/origin';

const MAX_THREADS = 10

export type Role = Exclude<ChatCompletionRole, 'function'>
export type ActionStatus = 'TODO' | 'DOING' | 'INTERRUPTED' | 'FAILURE' | 'SUCCESS'
export type ToolID = string
export type MessageIndex = number
export type ToolCall = ChatCompletionMessageToolCall
export type ToolCalls = Array<ToolCall>

// Feedback types
export type ReactionFeedback = 'positive' | 'negative' | 'unrated'

export interface MessageFeedback {
  reaction: ReactionFeedback;
}

interface Function {
  arguments: string,
  name: string,
}

// Message Type: ACTIONS
export interface BaseAction extends ToolCall {
  id: ToolID
  function: Function
  planID: MessageIndex
  status: ActionStatus
  finished: boolean
}

export interface OngoingAction extends BaseAction {
  status: Subset<ActionStatus, "TODO" | "DOING">
  finished: false
}

export type InterruptedActionStatus = Subset<ActionStatus, "INTERRUPTED" | "FAILURE">
export type FinishedActionStatus = Subset<ActionStatus, InterruptedActionStatus | "SUCCESS">
export interface FinishedAction extends BaseAction {
  status: FinishedActionStatus
  finished: true
}

export type Action = OngoingAction | FinishedAction

export interface ActionPlanMessageContent {
  type: Subset<ChatMessageContentType, "ACTIONS">
  actionMessageIDs: Array<MessageIndex>
  toolCalls: ToolCalls
  messageContent: string // this is right now for CoT for claude sonnet. will be empty usually
  finishReason: ChatCompletion.Choice['finish_reason']
  finished: boolean
}

export type ChatMessageContent = DefaultMessageContent | ActionPlanMessageContent | BlankMessageContent

export interface BaseChatMessage {
  index: MessageIndex,
  role: Role;
  content: ChatMessageContent
  feedback: MessageFeedback
  createdAt: number
  updatedAt: number
  debug: {}
}

export interface UserChatMessage extends BaseChatMessage {
  role: 'user'
  content: DefaultMessageContent
  debug: {}
}

export interface ActionPlanChatMessage extends BaseChatMessage {
  role: 'assistant'
  content: ActionPlanMessageContent
}

export type ActionChatMessageContent = Subset<ChatMessageContent, DefaultMessageContent | BlankMessageContent> & {
  renderInfo: ActionRenderInfo
  content?: string
}
export interface ActionChatMessage extends BaseChatMessage {
  role: 'tool'
  action: Action
  content: ActionChatMessageContent
  debug: {}
}

export type ChatMessage = UserChatMessage | ActionPlanChatMessage | ActionChatMessage

export type ChatThreadStatus = 'PLANNING' | 'EXECUTING' | 'FINISHED'

export type UserConfirmationInput = 'NULL' | 'APPROVE' | 'REJECT'

export interface UserConfirmationState {
  show: boolean
  content: string
  contentTitle?: string // optional title for the prompt that's shown to the user
  oldContent?: string // optional existing content to show diff for code
  userInput: UserConfirmationInput
}

export interface ClarificationQuestion {
  question: string
  options: string[]
}

export interface ClarificationAnswer {
  question: string
  answer: string
}

export interface ClarificationState {
  show: boolean
  questions: ClarificationQuestion[]
  answers: ClarificationAnswer[]
  currentQuestionIndex: number
  isCompleted: boolean
}

export interface Task {
  agent: string;
  args: any;
  id: number;
  parent_id: number | null;
  run_id: string;
  debug: any;
  child_ids: number[];
  result: any; // Key field for completion status
}

export type Tasks = Array<Task>

export interface ChatThread {
  index: number
  debugChatIndex: number
  messages: Array<ChatMessage>
  status: ChatThreadStatus
  userConfirmation: UserConfirmationState
  clarification: ClarificationState
  interrupted: boolean
  tasks: Tasks
  id: string
}

interface ChatState {
  threads: Array<ChatThread>
  activeThread: number,
  last_warmed_on: number
}

export const initialUserConfirmationState: UserConfirmationState = {
  show: false,
  content: '',
  userInput: 'NULL'
}

export const initialClarificationState: ClarificationState = {
  show: false,
  questions: [],
  answers: [],
  currentQuestionIndex: 0,
  isCompleted: false
}

export const initialTasks: Tasks = []

const currentSessionID = getUniqueString()

export function getID() {
  return currentSessionID + '_' + getParsedIframeInfo().r
}

function generateNextThreadID(currentID?: string): string {
  if (!currentID) {
    return `v0-${getID()}-0`
  }
  
  let newIndex = 0
  try {
    const splitID = currentID.split('-')
    const oldIndex = splitID[splitID.length - 1]
    newIndex = parseInt(oldIndex) + 1
  } catch (e) {
    newIndex = Date.now() % 1000000
  }
  return `v0-${getID()}-${newIndex}`
}

const initialState: ChatState = {
  threads: [{
    index: 0,
    debugChatIndex: -1,
    messages: [],
    status: 'FINISHED',
    userConfirmation: initialUserConfirmationState,
    clarification: initialClarificationState,
    interrupted: false,
    tasks: initialTasks,
    id: generateNextThreadID()
  }],
  activeThread: 0,
  last_warmed_on: 0
}

const getActiveThread = (state: ChatState) => state.threads[state.activeThread]

const getMessages = (state: ChatState) => getActiveThread(state).messages

/**
 * Converts a Task to a ChatCompletionMessageToolCall for display purposes
 */
const taskToToolCall = (task: Task): ChatCompletionMessageToolCall => ({
  id: `task_${task.id}`,
  type: 'function',
  function: {
    name: task.agent,
    arguments: JSON.stringify(task.args)
  }
})

/**
 * Converts a Task result to ActionChatMessageContent
 * Assumes task.result is always a string
 */
const taskResultToContent = (task: Task): ActionChatMessageContent => {
  return {
    type: 'BLANK',
    content: task.result as string,
    renderInfo: {
      text: '',
      code: undefined,
      oldCode: undefined,
      hidden: true
    }
  }
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (
      state,
      action: PayloadAction<Omit<UserChatMessage, "role" | "index" | "feedback" | "createdAt" | "updatedAt">>
    ) => {
      const messages = getMessages(state)
      const timestamp = Date.now()
      messages.push({
        ...action.payload,
        role: 'user',
        feedback: {
          reaction: "unrated"
        },
        index: messages.length,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      state.threads[state.activeThread].interrupted = false
      state.last_warmed_on = timestamp
    },
    deleteUserMessage: (
      state,
      action: PayloadAction<MessageIndex>
    ) => {
      const messageIndex = action.payload
      const activeThread = getActiveThread(state)
      if (activeThread.status != 'FINISHED') {
        return
      }
      activeThread.messages = activeThread.messages.slice(0, messageIndex)
      activeThread.id = generateNextThreadID(activeThread.id)
    },
    updateThreadID: (
      state,
    ) => {
      const activeThread = getActiveThread(state)
      activeThread.id = generateNextThreadID(activeThread.id)
    },
    addActionPlanMessage: (
      state,
      action: PayloadAction<{llmResponse: LLMResponse, debug: any}>
    ) => {
      const messages = getMessages(state)
      const latestMessageIndex = messages.length
      const toolCalls = action.payload.llmResponse.tool_calls
      const messageContent = action.payload.llmResponse.content
      const newTasks = action.payload.llmResponse.tasks || []
      const currentTasks = getActiveThread(state).tasks || []
      
      // Defensive programming: ensure we have valid arrays and lengths
      const currentTasksLength = Array.isArray(currentTasks) ? currentTasks.length : 0
      const newTasksLength = Array.isArray(newTasks) ? newTasks.length : 0
      
      // Find completed tasks from task diff (excluding first task which is main agent)
      // Only proceed if we have new tasks beyond the current ones
      const completedTasks = newTasksLength > currentTasksLength 
        ? newTasks
            .slice(Math.max(currentTasksLength, 1)) // Get only new tasks, skip main agent
            .filter(task => task && task.result !== null && task.result !== undefined)
        : []
      
      // Convert completed tasks to tool calls for display
      const completedToolCalls = completedTasks.map(taskToToolCall)
      
      // Calculate total action message IDs for both completed and pending tool calls
      const totalToolCalls = completedToolCalls.length + toolCalls.length
      const actionMessageIDs = [...Array(totalToolCalls).keys()].map((value) => value+1+latestMessageIndex)
      
      const timestamp = Date.now()
      const actionPlanMessage: ActionPlanChatMessage = {
        role: 'assistant',
        feedback: {
          reaction: "unrated"
        },
        index: latestMessageIndex,
        content: {
          type: 'ACTIONS',
          actionMessageIDs: actionMessageIDs,
          toolCalls: [...completedToolCalls, ...toolCalls], // Completed first, then pending
          messageContent,
          finishReason: action.payload.llmResponse.finish_reason,
          finished: completedTasks.length === totalToolCalls // Only finished if all are completed
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        debug: action.payload.debug
      }
      messages.push(actionPlanMessage)
      
      let messageIndex = 1
      
      // Add completed tasks as SUCCESS messages first
      completedTasks.forEach((task) => {
        const actionMessageID = messageIndex + latestMessageIndex
        const timestamp = Date.now()
        const actionMessage: ActionChatMessage = {
          role: 'tool',
          action: {
            ...taskToToolCall(task),
            planID: latestMessageIndex,
            status: 'SUCCESS',
            finished: true,
          },
          feedback: {
            reaction: "unrated"
          },
          index: actionMessageID,
          content: taskResultToContent(task),
          createdAt: timestamp,
          updatedAt: timestamp,
          debug: {}
        }
        messages.push(actionMessage)
        messageIndex++
      })
      
      // Add pending tool calls as TODO messages
      toolCalls.forEach((toolCall) => {
        const actionMessageID = messageIndex + latestMessageIndex
        const timestamp = Date.now()
        const actionMessage: ActionChatMessage = {
          role: 'tool',
          action: {
            ...toolCall,
            planID: latestMessageIndex,
            status: 'TODO',
            finished: false,
          },
          feedback: {
            reaction: "unrated"
          },
          index: actionMessageID,
          content: {
            type: 'BLANK',
            renderInfo: {
              text: undefined,
              code: undefined,
              oldCode: undefined
            }
          },
          createdAt: timestamp,
          updatedAt: timestamp,
          debug: {}
        }
        messages.push(actionMessage)
        messageIndex++
      })

      // Update tasks array with new tasks
      getActiveThread(state).tasks = newTasks
      
    },
    startAction: (
      state,
      action: PayloadAction<MessageIndex>
    ) => {
      const actionMessage = getMessages(state)[action.payload]
      if (actionMessage.role == 'tool' && !actionMessage.action.finished) {
        actionMessage.action.status = "DOING"
        actionMessage.updatedAt = Date.now()
      }
    },
    finishAction: (
      state,
      action: PayloadAction<{actionStatus: FinishedActionStatus, messageID: MessageIndex, content?: ActionChatMessageContent}>
    ) => {
      const { messageID, actionStatus, content } = action.payload
      const thread = state.activeThread
      const activeThread = state.threads[thread]
      const messages = activeThread.messages
      const actionMessage = messages[messageID]
      if (actionMessage.role == 'tool') {
        const currentAction = actionMessage.action
        if (!currentAction.finished) {
          actionMessage.action = {
            ...currentAction,
            finished: true,
            status: actionStatus
          }
          actionMessage.content = content || actionMessage.content
          actionMessage.updatedAt = Date.now()
        }
        const planID = currentAction.planID
        const planMessage = messages[planID]
        if (planMessage.content.type == 'ACTIONS') {
          const finishedActionIDs = planMessage.content.actionMessageIDs.filter(messageID => {
            const actionMessage = messages[messageID]
            return actionMessage.role == 'tool' && actionMessage.action.finished
          })
          if (finishedActionIDs.length == planMessage.content.actionMessageIDs.length) {
            planMessage.content.finished = true
            planMessage.updatedAt = Date.now()
          }
        }
      }
    },
    interruptPlan: (state, action: PayloadAction<{ planID: MessageIndex, actionStatus: InterruptedActionStatus }>) => {
      const { planID, actionStatus } = action.payload
      const messages = getMessages(state)
      const planMessage = messages[planID]
      if (planMessage.content.type == 'ACTIONS' && !planMessage.content.finished) {
        planMessage.content.actionMessageIDs.forEach(messageID => {
          const actionMessage = messages[messageID]
          if (actionMessage.role == 'tool' && !actionMessage.action.finished) {
            actionMessage.action = {
              ...actionMessage.action,
              finished: true,
              status: actionStatus
            }
            actionMessage.updatedAt = Date.now()
          }
        })
        planMessage.content.finished = true
        planMessage.updatedAt = Date.now()
      }
    },
    switchToThread: (state, action: PayloadAction<number>) => {
      // check that thread exists
      if (action.payload < state.threads.length) {
        state.activeThread = action.payload
      } else {
        console.error('Thread does not exist')
      }
    },
    startNewThread: (state) => {
        const currentMessages = getMessages(state)
        // If there are no messages, we don't need to start a new thread
        if (currentMessages.length == 0) {
            return
        }

        // If the user is on a previous thread, only start a new thread if the latest thread has messages
        if (state.activeThread != state.threads.length - 1) {
            const latestThread = state.threads[state.threads.length - 1]
            if (latestThread.messages.length == 0) {
                state.activeThread = state.threads.length - 1
                return
            }
        }
      // Clear existing tasks
      state.threads[state.activeThread].tasks = []
      state.threads[state.threads.length - 1].tasks = []
      if (state.threads.length >= MAX_THREADS) {
        const excessThreads = state.threads.length - MAX_THREADS + 1;
        state.threads.splice(0, excessThreads);
        
        state.threads.forEach((thread, index) => {
          thread.index = index;
        });
      }
      state.activeThread = state.threads.length
      const previousID = state.threads[state.threads.length - 1].id
      const newID = generateNextThreadID(previousID)
      state.threads.push({
        index: state.threads.length,
        messages: [],
        debugChatIndex: -1,
        status: 'FINISHED',
        userConfirmation: {
          show: false,
          content: '',
          userInput: 'NULL'
        },
        clarification: initialClarificationState,
        interrupted: false,
        tasks: [],
        id: newID
      })
    },
    addReaction: (
      state,
      action: PayloadAction<{
        index: MessageIndex,
        reaction: ReactionFeedback,
      }>,
    ) => {
      const thread = state.activeThread
      const messageIndex = action.payload.index
      const reaction = action.payload.reaction
      const currentMessage = state.threads[thread].messages[messageIndex]
      const currentFeedback = currentMessage.feedback
      currentFeedback.reaction = reaction
      currentMessage.updatedAt = Date.now()
    },
    removeReaction: (
      state,
      action: PayloadAction<{
        index: MessageIndex,
      }>,
    ) => {
      const thread = state.activeThread
      const messageID = action.payload.index
      const currentMessage = state.threads[thread].messages[messageID]
      const currentFeedback = currentMessage.feedback
      currentFeedback.reaction = 'unrated'
      currentMessage.updatedAt = Date.now()
    },
    updateDebugChatIndex: (
      state,
      action: PayloadAction<number>
    ) => {
      const thread = state.activeThread
      const activeThread = state.threads[thread]
      activeThread.debugChatIndex = action.payload
    },
    setActiveThreadStatus: (state, action: PayloadAction<ChatThreadStatus>) => {
      state.threads[state.activeThread].status = action.payload
    },
    toggleUserConfirmation: (state, action: PayloadAction<{
      show: boolean
      content: string,
      contentTitle?: string
      oldContent?: string
    }>) => {
      const userConfirmation = state.threads[state.activeThread].userConfirmation
      const { show, content, contentTitle, oldContent } = action.payload
      userConfirmation.show = show
      userConfirmation.content = content
      userConfirmation.contentTitle = contentTitle
      userConfirmation.oldContent = oldContent
      userConfirmation.userInput = 'NULL'
    },
    setUserConfirmationInput: (state, action: PayloadAction<UserConfirmationInput>) => {
      const userConfirmation = state.threads[state.activeThread].userConfirmation
      userConfirmation.userInput = action.payload
    },
    toggleClarification: (state, action: PayloadAction<{
      show: boolean
      questions: ClarificationQuestion[]
    }>) => {
      const clarification = state.threads[state.activeThread].clarification
      const { show, questions } = action.payload
      clarification.show = show
      clarification.questions = questions
      clarification.answers = []
      clarification.currentQuestionIndex = 0
      clarification.isCompleted = false
    },
    setClarificationAnswer: (state, action: PayloadAction<{
      questionIndex: number
      answer: string
    }>) => {
      const clarification = state.threads[state.activeThread].clarification
      const { questionIndex, answer } = action.payload
      const question = clarification.questions[questionIndex]
      
      // Update or add the answer
      const existingAnswerIndex = clarification.answers.findIndex(a => a.question === question.question)
      if (existingAnswerIndex >= 0) {
        clarification.answers[existingAnswerIndex].answer = answer
      } else {
        clarification.answers.push({ question: question.question, answer })
      }
      
      // Check if all questions are answered
      clarification.isCompleted = clarification.answers.length === clarification.questions.length
    },
    abortPlan: (state) => {
      const thread = state.activeThread
      const activeThread = state.threads[thread]
      activeThread.interrupted = true
    },
    updateLastWarmedOn: (state) => {
      state.last_warmed_on = Date.now()
    },
    clearTasks: (state) => {
        const activeThread = getActiveThread(state)
        activeThread.tasks = []
    },
    cloneThreadFromHistory: (state, action: PayloadAction<{
      sourceThreadIndex: number,
      upToMessageIndex: number
    }>) => {
      try {
        const { sourceThreadIndex, upToMessageIndex } = action.payload
        
        // Validate source thread exists
        if (sourceThreadIndex < 0 || sourceThreadIndex >= state.threads.length) {
          console.error('Invalid source thread index:', sourceThreadIndex)
          return
        }
        
        const sourceThread = state.threads[sourceThreadIndex]
        if (!sourceThread || !sourceThread.messages) {
          console.error('Source thread or messages not found')
          return
        }
        
        // Validate message index
        if (upToMessageIndex < 0 || upToMessageIndex >= sourceThread.messages.length) {
          console.error('Invalid message index:', upToMessageIndex)
          return
        }
        
        // Handle thread limit (remove oldest if at max)
        if (state.threads.length >= MAX_THREADS) {
          const excessThreads = state.threads.length - MAX_THREADS + 1;
          state.threads.splice(0, excessThreads);
          
          state.threads.forEach((thread, index) => {
            thread.index = index;
          });
        }
        
        // Generate new thread ID
        const previousID = state.threads[state.threads.length - 1].id
        const newID = generateNextThreadID(previousID)
        
        // Clone messages up to and including the specified index (threadHistory already calculated the correct endpoint)
        const endIndex = Math.min(upToMessageIndex, sourceThread.messages.length - 1);
        const clonedMessages = sourceThread.messages
          .slice(0, endIndex + 1)
          .map((message, index) => ({
            ...message,
            index,
            feedback: { reaction: 'unrated' as const },
            updatedAt: Date.now()
          }));
        
        // Create new thread
        const newThread: ChatThread = {
          index: state.threads.length,
          debugChatIndex: -1,
          messages: clonedMessages,
          status: 'FINISHED',
          userConfirmation: {
            show: false,
            content: '',
            userInput: 'NULL'
          },
          clarification: {
            show: false,
            questions: [],
            answers: [],
            currentQuestionIndex: 0,
            isCompleted: false
          },
          interrupted: false,
          tasks: [],
          id: newID
        }
        
        // Add thread and switch to it
        state.threads.push(newThread)
        state.activeThread = state.threads.length - 1
        
      } catch (error) {
        console.error('Error cloning thread from history:', error)
        // Don't change state on error - let existing thread remain active
      }
    }
  },
})

// Action creators are generated for each case reducer function
export const { addUserMessage, deleteUserMessage, addActionPlanMessage, startAction, finishAction, interruptPlan, startNewThread, addReaction, removeReaction, updateDebugChatIndex, setActiveThreadStatus, toggleUserConfirmation, setUserConfirmationInput, toggleClarification, setClarificationAnswer, switchToThread, abortPlan, updateThreadID, updateLastWarmedOn, clearTasks, cloneThreadFromHistory } = chatSlice.actions

export default chatSlice.reducer
