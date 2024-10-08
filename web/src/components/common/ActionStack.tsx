import React, { useState, useEffect } from 'react';
import { Box, HStack, Icon, Spinner, Text, keyframes } from '@chakra-ui/react'
import { Action } from '../../state/chat/reducer'
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { BsChevronRight, BsChevronDown } from 'react-icons/bs';
import {
  MdOutlineIndeterminateCheckBox,
  MdOutlineCheckBox,
  MdOutlineCheckBoxOutlineBlank,
  MdOutlineTimer
} from 'react-icons/md'
import { ChatContent } from './ChatContent';
import { getApp } from "../../helpers/app";
import 'reflect-metadata';

function removeThinkingTags(input: string): string {
  return input ? input.replace(/<thinking>[\s\S]*?<\/thinking>/g, '') : input;
}

function extractMessageContent(input: string): string {
  const match = (input || "").match(/<Message>([\s\S]*?)<\/Message>/);
  return match ? match[1] : "";
}

const PLANNING_ACTIONS = ['Planning', 'Understanding App state', 'Thinking', 'Finalizing Actions', 'Validating Answers']

export type ActionStatusView = Pick<Action, 'finished' | 'function' | 'status'>
export const ActionStack: React.FC<{status: string, actions: Array<ActionStatusView>, index:number, content: string, latency: number}> = ({
  actions,
  status,
  index,
  content,
  latency
}) => {
  const [isExpanded, setIsExpanded] = useState(status != 'FINISHED');
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);
  const [controller, setController] = useState<any>(null);

  useEffect(() => {
    const fetchController = async () => {
      const app = await getApp();
      setController(app.actionController);
    };

    fetchController();
  }, []);

  const getActionLabels = (action: string, attr: string) => {
    if (controller) {
      const metadata = Reflect.getMetadata('actionMetadata', controller, action);
      if (metadata) {
        return metadata[attr];
      }
    }
    return action;
  }
  
  const numOfActions = actions.length;
  let titles = [];
  if (status == 'PLANNING') {
    titles = PLANNING_ACTIONS
  } else if (status == 'FINISHED') {
    titles = actions.map(action => getActionLabels(action.function.name, 'labelDone'))    
    titles = [[...new Set(titles)].join(', ')]

  } else {
    titles = actions.map(action => getActionLabels(action.function.name, 'labelRunning'))
    titles = [[...new Set(titles)].join(', ')]

  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTitleIndex((prevIndex) => (prevIndex + 1) % titles.length);
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  const scrollUp = keyframes`
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0%);
      opacity: 1;
    }
    `;
  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }
  return (
    <HStack aria-label={titles[currentTitleIndex]} className={'action-stack'} justifyContent={'start'} width="100%"> 
      <Box
        // bg={'minusxGreen.800'}
        // p={2}
        px={2}
        py={1}
        my={0}
        borderRadius={5}
        // color={'minusxBW.50'}
        color={'minusxGreen.800'}
        border={'1px'}
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
          // borderBottomColor={'minusxBW.50'}
          borderBottomColor={'minusxGreen.800'}
          justifyContent={'space-between'}
          onClick={toggleExpand} cursor={"pointer"}
        >
          <HStack>
            {isExpanded ? <BsChevronDown flex={1} strokeWidth={1}/> : <BsChevronRight strokeWidth={1}  flex={1}/>}
            <Box flex={5}>
              <Text key={currentTitleIndex} animation={ status === 'PLANNING' ? `${scrollUp} 0.5s ease-in-out` : ""} >{titles[currentTitleIndex]}</Text>
            </Box>
            { status != 'FINISHED' ? <Spinner size="xs" speed={'0.75s'} color="minusxGreen.800" /> : null }
          </HStack>
          { status != 'PLANNING' ? <Text fontSize={"12px"} flexDirection={"row"} display={"flex"} justifyContent={"center"} alignItems={"center"}><MdOutlineTimer/>{latency}{"s"}</Text> : null }
          
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

export const OngoingActionStack: React.FC = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  
  if (activeThread.status == 'FINISHED') {
    return null
  }
  else if (activeThread.status == 'PLANNING') {
    return <ActionStack actions={[]} status={activeThread.status} index={-1} content='' latency={0}/>
  } 
  else {
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
    actionPlan.content.actionMessageIDs.forEach((messageID: string) => {
      const message = messages[messageID]
      if (message.role == 'tool') {
        actions.push(message.action)
      }
    })
    return <ActionStack actions={actions} content={actionPlan.content.messageContent} status={activeThread.status} index={-1} latency={0}/>
  }
}
