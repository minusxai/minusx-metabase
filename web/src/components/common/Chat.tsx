import React, { useState, useEffect, useRef } from 'react';
import { Box, HStack, VStack, IconButton, Stack, Text, Tooltip } from '@chakra-ui/react'
import { BsFillHandThumbsUpFill, BsFillHandThumbsDownFill, BsDashCircle, BsPlusCircleFill, BsStarFill } from 'react-icons/bs';
import { dispatch } from '../../state/dispatch'
import { ChatMessage, addReaction, removeReaction, deleteUserMessage, ActionChatMessage } from '../../state/chat/reducer'
import { addSavedQuestion, updateIsDevToolsOpen, updateDevToolsTabName } from '../../state/settings/reducer'
import _, { cloneDeep, isEmpty } from 'lodash'
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { ActionStack, ActionStatusView, OngoingActionStack } from './ActionStack';
import { ChatContent } from './ChatContent';
import { getApp } from '../../helpers/app';
import { SettingsBlock } from './SettingsBlock'
import { Markdown } from './Markdown';
import { Tasks } from './Tasks'
import { TasksLite } from './TasksLite'
import { getParsedIframeInfo } from '../../helpers/origin'
import { DemoHelperMessage, DemoSuggestions } from './DemoComponents';
import { configs } from '../../constants'
import { setMinusxMode } from '../../app/rpc'

// adds tool information like execution status and rendering info
// this stuff is in the 'tool' messages, but we're ony rendering 'assistant' messages
// so this copy needs to be done while rendering.
function addToolInfoToActionPlanMessages(messages: Array<ChatMessage>) {
  const result = [...messages]
  const toolMessageMap = new Map<string, ActionChatMessage>()
  
  // Process messages in reverse order
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    
    if (message.role === 'tool') {
      // Add tool message to map
      const toolMessage = message as ActionChatMessage
      toolMessageMap.set(toolMessage.action.id, toolMessage)
    } else if (message.role === 'assistant') {
      // Process assistant message using current tool map
      const toolCalls = message.content.toolCalls.map(toolCall => {
        const toolMessage = toolMessageMap.get(toolCall.id)
        if (toolMessage) {
          return {
            ...toolCall,
            status: toolMessage.action.status,
            content: toolMessage.content.content,
            renderInfo: toolMessage.content.renderInfo
          }
        } else {
          return toolCall
        }
      })
      
      result[i] = {
        ...message,
        content: {
          ...message.content,
          toolCalls
        }
      }
      
      // Clear the map after processing this assistant message
      toolMessageMap.clear()
    }
  }
  
  return result
}

const Chat: React.FC<ReturnType<typeof addToolInfoToActionPlanMessages>[number]> = ({
  index,
  role,
  content,
  feedback,
  debug
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const reaction = feedback?.reaction
  const clearMessages = () => dispatch(deleteUserMessage(index))
  const saveQuestion = async () => {
    if (content.type === 'DEFAULT' && content.text) {
      dispatch(addSavedQuestion(content.text))
      dispatch(updateIsDevToolsOpen(true))
      dispatch(updateDevToolsTabName('Memory'))
      await setMinusxMode('open-sidepanel-devtools')
    }
  }
  if (content.type == 'BLANK') {
    return null
  } else if (content.type == 'ACTIONS') {
    if (!content.finished) {
      return null
    }
    const actions: ActionStatusView[] = []
    content.toolCalls.forEach(toolCall => {
      if (!toolCall.renderInfo.hidden) {
        actions.push({
          finished: true,
          function: toolCall.function,
          status: toolCall.status,
          renderInfo: toolCall.renderInfo,
          output: toolCall.content,
        })
      }
    })
    const latency = ('latency' in debug)? Math.round(debug.latency as number /100)/10 : 0
    return <ActionStack content={content.messageContent} actions={actions} status={'FINISHED'} index={index} latency={latency}/>
  }
  return (
    <HStack
      className={`chat ${role}`}
      aria-label={role === 'user' ? 'user-message' : 'assistant-message'}
      justifyContent={role == 'user' ? 'end' : 'start'}
      width="100%"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        className={'bubble-container'}
        width="90%"
        // paddingBottom={1}
        position="relative"
      >
        <Box
          className={'bubble'}
          aria-label={role === 'user' ? 'user-message-bubble' : 'assistant-message-bubble'}
          bg={role == 'user' ? 'minusxBW.300' : 'minusxGreen.800'}
          // bg={role == 'user' ? 'minusxBW.300' : 'minusxBW.600'}
          px={3} py={2}
          borderRadius={role == 'user' ? '10px 10px 0 10px' : '10px 10px 10px 0'}
          color={role == 'user' ? 'minusxBW.900' : 'minusxBW.50'}
          position="relative"
        >
          <ChatContent content={content} messageIndex={index} role={role}/>
          
          <Box
            aria-label='message-arrow'
            position="absolute"
            bottom="-5px"
            left={role == 'user' ? 'auto' : '0px'}
            right={role == 'user' ? '0px' : 'auto'}
            width="0"
            height="0"
            borderWidth={'3px'}
            borderStyle={"solid"}
            borderTopColor={role == 'user' ? 'minusxBW.300' : 'minusxGreen.800'}
            // borderTopColor={role == 'user' ? 'minusxBW.300' : 'minusxBW.600'}
            borderBottomColor="transparent"
            borderRightColor={role == 'user' ? 'minusxBW.300' : 'transparent'}
            borderLeftColor={role == 'user' ? 'transparent' : 'minusxGreen.800'}
            // borderLeftColor={role == 'user' ? 'transparent' : 'minusxBW.600'}
          />
        </Box>
        {/* {(isHovered || (reaction !== "unrated")) && (role == 'tool') && (
          <Box aria-label="message-reactions" position="absolute" bottom={-1} right={0}>
            <IconButton
              aria-label="Thumbs up"
              isRound={true}
              icon={<BsFillHandThumbsUpFill />}
              size="xs"
              colorScheme={ reaction === "positive" ? "minusxGreen" : "minusxBW" }
              mr={1}
              onClick={reaction == "positive" ? clearReactions : addPositiveReaction}
            />
            <IconButton
              aria-label="Thumbs down"
              isRound={true}
              icon={<BsFillHandThumbsDownFill />}
              size="xs"
              colorScheme={ reaction === "negative" ? "minusxGreen" : "minusxBW" }
              onClick={reaction == "negative" ? clearReactions : addNegativeReaction}
            />
          </Box>
        )} */}
        {(isHovered || (reaction !== "unrated")) && (role == 'user') && (
          <Box aria-label="message-actions" position="absolute" bottom={-1} right={0}>
            <Tooltip label="Delete message" placement="top">
              <IconButton
                aria-label="Delete"
                isRound={true}
                icon={<BsDashCircle />}
                size="xs"
                colorScheme={ reaction === "positive" ? "minusxGreen" : "minusxBW" }
                mr={1}
                onClick={clearMessages}
              />
            </Tooltip>
          </Box>
        )}
        {(isHovered) && (role == 'user') && (
          <Box aria-label="message-actions" position="absolute" bottom={-1} right={7}>
            <Tooltip label="Save question" placement="top">
              <IconButton
                aria-label="Save"
                isRound={true}
                icon={<BsStarFill />}
                size="xs"
                colorScheme={ "minusxGreen" }
                mr={1}
                onClick={saveQuestion}
              />
            </Tooltip>
          </Box>
        )}
      </Box>
    </HStack>
  )
}

const useAppStore = getApp().useStore()

export const ChatSection = () => {
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const messages = activeThread.messages
  const tasks = activeThread.tasks
  const url = useAppStore((state) => state.toolContext)?.url || ''

  // Auto-scroll to last message when thread status is not FINISHED (ongoing action)
  useEffect(() => {
    if (activeThread.status !== 'FINISHED') {
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [activeThread.status]);

  // useEffect(() => {
  //   setTimeout(() => {
  //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  //   }, 100);
  // }, [messages.length]);
  // need to add status information to tool calls of role='assistant' messages
  // just create a map of all role='tool' messages by their id, and for each
  // tool call in each assistant message, add the status from the corresponding
  // tool message
  const messagesWithStatusInfo = addToolInfoToActionPlanMessages(messages)
  const messagesWithStatus = messagesWithStatusInfo.flatMap(message => {
    // if (message.role == 'assistant' && message.content.toolCalls.length == 0) {
    const returnValue = [message]
    if (message.role == 'assistant' && message.content.messageContent && message.content.messageContent.length > 0) {
      const newMessage = cloneDeep(message) as any
      newMessage.content = {
        type: 'DEFAULT',
        text: message.content.messageContent,
        images: []
      }
      returnValue.push(newMessage)
    }
    return returnValue
  })
  const Chats = isEmpty(messagesWithStatus) ?
    <DemoHelperMessage url={url}/>:
    messagesWithStatus.map((message, key) => (
      <Chat key={key} {...message}/>
    ))

  return (
  <VStack justifyContent="space-between" alignItems="stretch" height={"100%"} width={"100%"}>
  <HStack className='chat-section' wrap="wrap" style={{ overflowY: 'scroll' }} width={'100%'} gap={1.5}>
    {Chats}
    { configs.IS_DEV && tasks.length && <Tasks /> }
    { !configs.IS_DEV &&  tasks.length && <TasksLite /> }
    {/* { tasks.length && <TasksLite /> } */}
    <OngoingActionStack />
    <div style={{ height: '10px', width: '100%' }} ref={lastMessageRef} />
  </HStack>
  <DemoSuggestions url={url}/>
  </VStack>
  )
}
