import React, { useState, useEffect, useRef } from 'react';
import { Box, HStack, VStack, IconButton, Stack, Text, Tooltip, Icon, Spinner, Button } from '@chakra-ui/react'
import { BsDashCircle, BsPlusCircleFill, BsStarFill } from 'react-icons/bs';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { BiSolidCheckCircle, BiSolidErrorCircle, BiHourglass } from 'react-icons/bi';
import { dispatch } from '../../state/dispatch'
import { ChatMessage, addReaction, removeReaction, deleteUserMessage, ActionChatMessage } from '../../state/chat/reducer'
import { addSavedQuestion, updateIsDevToolsOpen, updateDevToolsTabName } from '../../state/settings/reducer'
import _, { cloneDeep, isEmpty } from 'lodash'
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
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
import { CodeBlock } from './CodeBlock';
import {processModelToUIText} from '../../helpers/utils';
import { executeAction } from '../../planner/plannerActions'
import { BiUndo, BiRedo } from "react-icons/bi";
import { PlanningActionStack } from './ActionStack';

const UNDO_REDO_ACTIONS = ['ExecuteQuery', 'EditAndExecuteQuery', 'ExecuteQueryV2', 'EditAndExecuteQueryV2']
const TABLE_OUTPUT_ACTIONS = ['ExecuteQuery', 'EditAndExecuteQuery', 'ExecuteMBQLQuery', 'ExecuteQueryV2', 'EditAndExecuteQueryV2', 'ExecuteMBQLQueryV2']


// adds tool call information (function name, args) from assistant messages to tool messages
// processes in forward order to match each tool message with its preceding assistant's toolCall
function addToolCallInfoToToolMessages(messages: Array<ChatMessage>) {
  const result = [...messages]
  const toolCallMap = new Map<string, any>()

  // Process messages in forward order
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    if (message.role === 'assistant') {
      // Add all toolCalls to map
      message.content.toolCalls.forEach(toolCall => {
        toolCallMap.set(toolCall.id, toolCall)
      })
    } else if (message.role === 'tool') {
      // Process tool message using current toolCall map
      const toolMessage = message as ActionChatMessage
      const toolCallInfo = toolCallMap.get(toolMessage.action.id)

      if (toolCallInfo) {
        result[i] = {
          ...message,
          content: {
            ...toolMessage.content,
            action: {
              ...toolMessage.action,
              ...toolCallInfo
            }
          } as any
        }
      }
    }
  }

  return result
}


const UndoRedo: React.FC<{fn: string, sql: string, type: 'undo' | 'redo', extraArgs: any}> = ({fn, sql, type, extraArgs}) => {
    const urHandler = (event: React.MouseEvent, fn: string, sql: string) => {
        event.preventDefault();
        event.stopPropagation();
        executeAction({
            index: -1,
            function: 'ExecuteQuery',
            args: {sql: sql, template_tags: extraArgs?.template_tags || {}, parameters: extraArgs?.parameters || [], skipConfirmation: true},
        });
    };
    
    return <Button
            size="xs"
            w={"100%"}
            leftIcon={ type === 'undo' ? <BiUndo /> : <BiRedo /> }
            variant={'solid'}
            colorScheme="minusxGreen"
            onClick={(event) => urHandler(event, fn, sql)}>
                {type === 'undo' ? 'Undo' : 'Redo'}
            </Button>
};

const ConvMessage: React.FC<ReturnType<typeof addToolCallInfoToToolMessages>[number]> = ({
    index,
    role,
    content,
    feedback,
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
            borderBottomColor="transparent"
            borderRightColor={role == 'user' ? 'minusxBW.300' : 'transparent'}
            borderLeftColor={role == 'user' ? 'transparent' : 'minusxGreen.800'}
          />
        </Box>
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

const ToolMessage: React.FC<{index: number, content: any}> = ({index, content}) => {
    const { action, renderInfo } = content
    const { textRI, code, language, extraArgs, oldCode } = renderInfo || {}
    const text = content.text || textRI || ''
    const functionName = action?.function?.name || 'Unknown'
    const output = content.content || ''
    const status = action?.status || 'TODO'
    const finished = action?.finished || false
    const renderAsMessage = functionName === 'TalkToUser'
    const currentTool = useSelector((state: RootState) => state.settings.iframeInfo.tool)
    const [isCodeExpanded, setIsCodeExpanded] = useState(false)
    const embedConfigs = useSelector((state: RootState) => state.configs.embed);
    const pageType = useAppStore((state) => state.toolContext.pageType) || '';
    const url = useAppStore((state) => state.toolContext.url) || '';
    const origin = url ? new URL(url).origin : '';
    const thread = useSelector((state: RootState) => state.chat.activeThread)
    const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
    const taskInProgress = !(activeThread.status == 'FINISHED')
    const totalThreads = useSelector((state: RootState) => state.chat.threads.length)
    const lastThread = (thread === totalThreads - 1)
      

    if (renderAsMessage) {
        return (
            <ConvMessage index={index} role='assistant' content={{
                images: [],
                type: 'DEFAULT',
                text: text || ''
            }} />
        )
    }

    const getStatusIcon = () => {
        if (!finished) {
            if (status === 'DOING') {
                return <Spinner size="xs" speed="0.8s" thickness="2px" color="blue.500" title="Running" />;
            }
            return <Icon as={BiHourglass} color="gray.500" title="Pending" />;
        }
        if (status === 'SUCCESS') {
            return <Icon as={BiSolidCheckCircle} color="green.500" title="Completed" />;
        }
        return <Icon as={BiSolidErrorCircle} color="red.500" title="Failed" />;
    };

    const tableOutputs = TABLE_OUTPUT_ACTIONS.includes(functionName) && (
        <HStack w={"100%"} justify={"center"} mb={2} overflowX={'auto'}>
            <Markdown content={processModelToUIText(output, origin, embedConfigs)} />
        </HStack>
    )

    const undoRedoArr = UNDO_REDO_ACTIONS.includes(action.function.name) && lastThread && (
                <HStack w={"100%"} justify={"center"} mb={2}>
                    {oldCode ? <UndoRedo fn={action.function.name} sql={oldCode} type={'undo'} extraArgs={extraArgs?.old || {}}/>:<UndoRedo fn={action.function.name} sql={''} type={'undo'} extraArgs={extraArgs?.old || {}}/>}
                    {code ? <UndoRedo fn={action.function.name} sql={code} type={'redo'} extraArgs={extraArgs?.new || {}}/> : <UndoRedo fn={action.function.name} sql={''} type={'redo'} extraArgs={extraArgs?.new || {}}/> }
                </HStack>
            )

    return (
        <>
        <VStack
            bg={'minusxBW.200'}
            p={2}
            borderRadius={5}
            width={'90%'}
            alignItems={'flex-start'}
            spacing={1}
            border={'1px'}
            borderColor={'minusxGreen.800'}
        >
            <HStack spacing={2} w="100%" justifyContent={'space-between'}>
                <HStack spacing={1.5}>
                    {getStatusIcon()}
                    <Text fontSize={'sm'} fontWeight={'semibold'} color={'minusxGreen.800'}>
                        {functionName}
                    </Text>
                </HStack>
                {code && (
                    <HStack
                        spacing={0.5}
                        cursor="pointer"
                        onClick={() => setIsCodeExpanded(!isCodeExpanded)}
                        p={1}
                        _hover={{ opacity: 0.8}}
                    >
                        <Text fontSize={'xs'} fontWeight={'medium'} color={'minusxGreen.800'}>
                            Code
                        </Text>
                        <Icon
                            as={isCodeExpanded ? ChevronDownIcon : ChevronRightIcon}
                            color={'minusxGreen.800'}
                            boxSize={3}
                        />
                    </HStack>
                )}
            </HStack>
            {pageType && pageType == 'sql' && !taskInProgress && undoRedoArr}
            {text && (
                <Box width={'100%'}>
                    <Markdown content={text} />
                </Box>
            )}
            {code && isCodeExpanded && (
                <VStack width={"100%"} alignItems={"stretch"} spacing={1}>
                    {code && <Box width={"100%"} p={2} bg={"#1e1e1e"} borderRadius={5}>
                        <CodeBlock code={code || ""} tool={currentTool} oldCode={oldCode} language={language} />
                    </Box>}
                    {extraArgs && <CodeBlock code={JSON.stringify(extraArgs, null, 2)} language='json' tool={currentTool}/>}
                </VStack>
            )}
        </VStack>
        {tableOutputs}
        </>
    )
}

const Chat: React.FC<ReturnType<typeof addToolCallInfoToToolMessages>[number]> = ({
  index,
  role,
  content,
  feedback,
  debug
}) => {

  // Convention
  // 1. If it is a user message, display it
  // 2. If it is an assistant message without tool calls, display it
  // 3. If it is an assistant message with tool calls, skip it
  // 4. If it is a tool message, display it

    if (role == 'user') {
        return <ConvMessage index={index} role={role} content={content} feedback={feedback}/>
    }
    else if (role == 'assistant' && content.toolCalls?.length == 0) {
        return <ConvMessage index={index} role={role} content={{
            images: [],
            type: 'DEFAULT',
            text: content.messageContent || ''
        }} feedback={feedback}/>
    }
    else if (role == 'tool') {
        return <ToolMessage index={index} content={content}/>
    }
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
  const messagesWithStatusInfo = addToolCallInfoToToolMessages(messages)
  console.log('Messages with tool call info', messagesWithStatusInfo)
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
    {/* <OngoingActionStack /> */}
    {activeThread.status === 'PLANNING' && <PlanningActionStack />}
    <div style={{ height: '10px', width: '100%' }} ref={lastMessageRef} />
  </HStack>
  <DemoSuggestions url={url}/>
  </VStack>
  )
}
