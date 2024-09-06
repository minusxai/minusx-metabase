import { useState, useEffect, useRef } from 'react';
import { Box, HStack, VStack, Icon, Spinner, Text, IconButton, Divider } from '@chakra-ui/react'
import { BsFillHandThumbsUpFill, BsFillHandThumbsDownFill, BsDashCircle, BsBugFill, BsChevronRight, BsChevronDown } from 'react-icons/bs';
import { dispatch } from '../../state/dispatch'
import { ChatMessage, addReaction, removeReaction, ChatMessageContent, ActionPlanMessageContent, ActionPlanChatMessage, 
  Action, deleteUserMessage, updateDebugChatIndex, 
  ActionChatMessage,
  ToolCall,
  UserChatMessage} from '../../state/chat/reducer'
import { updateIsDevToolsOpen, updateDevToolsTabName } from '../../state/settings/reducer';
import React from 'react'
import { configs } from '../../constants';
import {
  MdOutlineIndeterminateCheckBox,
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank

} from 'react-icons/md'
import _ from 'lodash'
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import Markdown from 'react-markdown'

const ChatContent: React.FC<{content: ChatMessageContent}> = ({
  content
}) => {
  if (content.type == 'DEFAULT' || content.type == 'LUCKY') {
    return (
      <div style={content.type == 'LUCKY'? {color: 'red'}: {}}>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown>
          {content.text}
        </Markdown>
      </div>
    )
  } else {
    return null
  }
}


function addStatusInfoToActionPlanMessages(messages: Array<ChatMessage>) {
  const toolMessages = messages.filter(message => message.role == 'tool')
  const toolMessageMap = new Map(toolMessages.map((message: ActionChatMessage) => [message.action.id, message]))
  return messages.map(message => {
    if (message.role == 'assistant') {
      const toolCalls = message.content.toolCalls.map(toolCall => {
        const toolMessage = toolMessageMap.get(toolCall.id)
        if (toolMessage) {
          return {
            ...toolCall,
            status: toolMessage.action.status
          }
        } else {
          return toolCall
        }
      })
      return {
        ...message,
        content: {
          ...message.content,
          toolCalls
        }
      }
    } else {
      return message
    }
  })
}

const Chat: React.FC<ReturnType<typeof addStatusInfoToActionPlanMessages>[number]> = ({
  index,
  role,
  content,
  feedback,
  debug
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const reaction = feedback?.reaction
  const addPositiveReaction = () => dispatch(addReaction({index, reaction: "positive"}))
  const addNegativeReaction = () => dispatch(addReaction({index, reaction: "negative"}))
  const clearReactions = () => dispatch(removeReaction({index}))
  const clearMessages = () => dispatch(deleteUserMessage(index))
  if (content.type == 'BLANK') {
    return null
  } else if (content.type == 'ACTIONS') {
    if (!content.finished) {
      return null
    }
    const actions: ActionStatusView[] = []
    content.toolCalls.forEach(toolCall => {
      actions.push({
        finished: true,
        function: toolCall.function,
        status: toolCall.status
      })
    })
    const latency = ('latency' in debug)? Math.round(debug.latency/100)/10 : 0
    return <ActionStack content={content.messageContent} actions={actions} status={'FINISHED'} index={index} latency={latency}/>
  }
  return (
    <HStack
      className={`chat ${role}`}
      justifyContent={role == 'user' ? 'end' : 'start'}
      width="100%"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        className={'bubble-container'}
        width="90%"
        paddingBottom={1}
        position="relative"
      >
        <Box
          className={'bubble'}
          bg={role == 'user' ? 'minusxBW.300' : 'minusxGreen.800'}
          padding={3}
          borderRadius={role == 'user' ? '10px 10px 0 10px' : '10px 10px 10px 0'}
          color={role == 'user' ? 'minusxBW.900' : 'minusxBW.50'}
          position="relative"
        >
          <ChatContent content={content} />
          
          <Box
            position="absolute"
            bottom="-5px"
            left={role == 'user' ? 'auto' : '0px'}
            right={role == 'user' ? '0px' : 'auto'}
            width="0"
            height="0"
            borderWidth={'3px'}
            borderStyle={"solid"}
            borderTopColor={role == 'user' ? 'minusxBW.300' : 'minusxGreen.800'}
            borderBottomColor="transparent"
            borderRightColor={role == 'user' ? 'minusxBW.300' : 'transparent'}
            borderLeftColor={role == 'user' ? 'transparent' : 'minusxGreen.800'}
          />
        </Box>
        {(isHovered || (reaction !== "unrated")) && (role == 'tool') && (
          <Box position="absolute" bottom={-1} right={0}>
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
        )}
        {(isHovered || (reaction !== "unrated")) && (role == 'user') && (
          <Box position="absolute" bottom={-1} right={0}>
            <IconButton
              aria-label="Delete"
              isRound={true}
              icon={<BsDashCircle />}
              size="xs"
              colorScheme={ reaction === "positive" ? "minusxGreen" : "minusxBW" }
              mr={1}
              onClick={clearMessages}
            />
          </Box>
        )}
      </Box>
    </HStack>
  )
}

function removeThinkingTags(input: string): string {
  return input ? input.replace(/<thinking>[\s\S]*?<\/thinking>/g, '') : input;
}

function extractMessageContent(input: string): string {
  const match = (input || "").match(/<Message>([\s\S]*?)<\/Message>/);
  return match ? match[1] : "";
}

type ActionStatusView = Pick<Action, 'finished' | 'function' | 'status'>
export const ActionStack: React.FC<{status: string, actions: Array<ActionStatusView>, index:number, content: string, latency: number}> = ({
  actions,
  status,
  index,
  content,
  latency
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(status != 'FINISHED');
  const numOfActions = actions.length
  const title = status == 'PLANNING' ? 'Planning' : status == 'FINISHED' ? `Completed ${numOfActions} ${numOfActions > 1?"Actions" : "Action"}` : 'Executing Actions'
  // const showDebugInfo = () => {
  //   dispatch(updateDebugChatIndex(index))
  //   dispatch(updateDevToolsTabName('Context History'))
  //   dispatch(updateIsDevToolsOpen(true))
  // }
  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }
  return (
    <HStack aria-label={title} className={'action-stack'} justifyContent={'start'} width="100%"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}> 
      <Box
        bg={'minusxGreen.800'}
        padding={2}
        borderRadius={5}
        color={'minusxBW.50'}
        width={'90%'}
        position="relative"
      > 
        {content && <>
          <ChatContent content={{
            type: "DEFAULT",
            images: [],
            text: extractMessageContent(content)
          }} />
          <br />
        </>}
        <HStack
          // add border only if actions are present
          paddingBottom={actions.length && isExpanded ? 1 : 0}
          marginBottom={actions.length && isExpanded ? 1 : 0}
          borderBottomWidth={ actions.length && isExpanded ? '1px' : '0px'}
          borderBottomColor={'minusxBW.50'}
          justifyContent={'space-between'}
        >
          <HStack>
            {isExpanded ? <BsChevronDown strokeWidth={1} onClick={toggleExpand} cursor={"pointer"}/> : 
            <BsChevronRight strokeWidth={1} onClick={toggleExpand} cursor={"pointer"}/> }
            <Text>{title}</Text>
            { status != 'FINISHED' ? <Spinner size="xs" speed={'0.75s'} color="minusxBW.50" /> : null }
          </HStack>
          { status != 'PLANNING' ? <Text fontSize={"10px"}>{"thinking: "}{latency}{"s"}</Text> : null }
          
        </HStack>
        {isExpanded && actions.map((action, index) => (
          <HStack className={'action'} padding={'2px'} key={index}>
            <Icon
              as={
                !action.finished
                  ? MdOutlineCheckBoxOutlineBlank
                  : (action.status == 'SUCCESS' ?  MdOutlineCheckBox : MdOutlineIndeterminateCheckBox)
              }
              boxSize={5}
            />
            <Text>{action.function.name}</Text>
          </HStack>
        ))}
        {/* {isHovered && isExpanded && configs.IS_DEV && index >= 0 && (
        <Box position="absolute" top={-1} right={0}>
          <IconButton
            aria-label="Debug Info"
            isRound={true}
            icon={<BsBugFill />}
            size="xs"
            colorScheme={"minusxBW"}
            mr={1}
            onClick={showDebugInfo}
          />
        </Box>
        )} */}
      </Box>
    </HStack>
  )
}

const OngoingActionStack: React.FC = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  if (activeThread.status == 'FINISHED') {
    return null
  }
  else if (activeThread.status == 'PLANNING') {
    return <ActionStack actions={[]} status={activeThread.status} index={-1} content='' latency={0}/>
  } else {
    const messages = activeThread.messages
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role != 'tool') {
      return null
    }
    const actionPlan = messages[lastMessage.action.planID]
    if (actionPlan.role != 'assistant') {
      return null
    }
    const actions: ActionStatusView[] = []
    actionPlan.content.actionMessageIDs.forEach(messageID => {
      const message = messages[messageID]
      if (message.role == 'tool') {
        actions.push(message.action)
      }
    })
    return <ActionStack actions={actions} content={actionPlan.content.messageContent} status={activeThread.status} index={-1} latency={0}/>
  }
}

export const ChatSection = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const messages = activeThread.messages

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);
  // need to add status information to tool calls of role='assistant' messages
  // just create a map of all role='tool' messages by their id, and for each
  // tool call in each assistant message, add the status from the corresponding
  // tool message
  const messagesWithStatus = addStatusInfoToActionPlanMessages(messages)
  const Chats = messagesWithStatus.map((message, key) => (<Chat key={key} {...message} />))

  return (
  <VStack className='chat-section'  style={{ overflowY: 'scroll' }} width={'100%'}>
    {Chats}
    <OngoingActionStack />
    <div ref={messagesEndRef} />
  </VStack>
  )
}
