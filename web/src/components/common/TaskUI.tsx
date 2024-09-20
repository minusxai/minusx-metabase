import {
  HStack,
  Textarea,
  VStack,
  Icon,
  IconButton,
  Divider,
  Tooltip,
  Text,
  Switch,
  Spinner
} from '@chakra-ui/react'
import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import RunTaskButton from './RunTaskButton'
import AbortTaskButton from './AbortTaskButton'
import { ChatSection } from './Chat'
import { HiOutlineRefresh } from 'react-icons/hi'
import { HiMiniSparkles } from "react-icons/hi2";
import chat from '../../chat/chat'
import _ from 'lodash'
import { abortPlan, startNewThread } from '../../state/chat/reducer'
import { resetThumbnails, setInstructions as setTaskInstructions } from '../../state/thumbnails/reducer'
import { setSuggestQueries } from '../../state/settings/reducer'
import { RootState } from '../../state/store'
import {  Button, Flex } from '@chakra-ui/react';
import { getSuggestions } from '../../helpers/LLM/remote'
import { Thumbnails } from './Thumbnails'
import { UserConfirmation } from './UserConfirmation'
import { gdocReadSelected, gdocRead, gdocWrite, gdocImage, queryDOMSingle } from '../../app/rpc'
import { forwardToTab } from '../../app/rpc'
import { feelinLucky } from '../../app/lucky'
import { getApp } from '../../helpers/app'
import { JupyterNotebookState } from '../../../../apps/src/jupyter/helpers/DOMToState'
import { querySelectorMap as jupyterQSMap } from '../../../../apps/src/jupyter/helpers/querySelectorMap'
import { getElementScreenCapture } from '../../app/rpc'
import { metaPlanner } from '../../planner/metaPlan'
 

interface ChatSuggestionsProps {
  suggestQueries: boolean;
  toggleSuggestions: (value: boolean) => void;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ suggestQueries, toggleSuggestions, suggestions, onSuggestionClick }) => {
  return (
    <Flex wrap="wrap" gap={2}>
      <HStack justifyContent={"space-between"} width={"100%"}>
        <HStack color="minusxGreen.500">
          <HiMiniSparkles/>
          <Text fontSize="sm" fontWeight={"bold"}>Suggestions</Text>
        </HStack>
        <HStack marginTop={0}>
          <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size={"sm"} isChecked={suggestQueries} onChange={(e) => toggleSuggestions(e.target.checked)} />
        </HStack>
      </HStack>

      {suggestQueries && suggestions.length === 0 && (
        <HStack justifyContent={"center"} width={"100%"}><Spinner size="xs" color="minusxGreen.500" /></HStack>
      )}

      {suggestQueries && suggestions.map((suggestion, index) => (
        <Button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          size="sm"
          colorScheme="blue"
          variant="outline"
          borderRadius="5px"
          textAlign={"left"}
          p={2}
          style={{
            whiteSpace: "normal",
            wordWrap: "break-word",
            height: "auto"
          }}
        >
          {suggestion}
        </Button>
      ))}
    </Flex>
  );
};

const tooLongTooltip = (
  <span>
    Your message history is too long. 
    <br/>
     Try resetting.
  </span>
)

const TaskUI = forwardRef<HTMLTextAreaElement>((_props, ref) => {
  const currentTool = useSelector((state: RootState) => state.settings.iframeInfo.tool)
  const initialInstructions = useSelector((state: RootState) => state.thumbnails.instructions)
  const [instructions, setInstructions] = useState<string>(initialInstructions)
  const [metaQuestion, setMetaQuestion] = useState<string>("")
  const thumbnails = useSelector((state: RootState) => state.thumbnails.thumbnails)
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const suggestQueries = useSelector((state: RootState) => state.settings.suggestQueries)
  const demoMode = useSelector((state: RootState) => state.settings.demoMode)
  const messages = activeThread.messages
  const userConfirmation = activeThread.userConfirmation
  const dispatch = useDispatch()
  const taskInProgress = !(activeThread.status == 'FINISHED')
  const[showMessagesTooLong, setShowMessagesTooLong] = useState(messages?.length > 100)

  const debouncedSetInstruction = useCallback(
    _.debounce((instructions) => dispatch(setTaskInstructions(instructions)), 500),
    []
  );
  useEffect(() => {
    debouncedSetInstruction(instructions);
    return () => debouncedSetInstruction.cancel();
  }, [instructions, debouncedSetInstruction]);

  const clearMessages = () => {
    dispatch(startNewThread())
  }

  const toggleSuggestions = (value: boolean) => {
    dispatch(setSuggestQueries(value))
  }


  const runTask = async () => {
    if (instructions) {
      chat.addUserMessage({
        content: {
          type: "DEFAULT",
          text: instructions,
          images: thumbnails
        },
      })
      dispatch(resetThumbnails())
      setInstructions('')
    }
  }

  // suggestions stuff
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const setSuggestionsDebounced = useCallback(
    _.debounce(async() => {
      const suggestions = await getSuggestions()
      console.log('Suggestions are', suggestions)
      setSuggestions(suggestions)
    }, 500),
    []
  );
  useEffect(() => {
    setSuggestions([]);
    if (!taskInProgress && suggestQueries) {
      setSuggestionsDebounced()
      return () => setSuggestionsDebounced.cancel();
    }
  }, [messages, taskInProgress, setSuggestionsDebounced, suggestQueries]);

  useEffect(() => {
    if (!taskInProgress && ref?.current) {
      ref.current.focus();
    }
  }, [taskInProgress]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runTask()
    }
  }
  let resetMessageHistoryButton = (<IconButton
    isRound={true}
    onClick={clearMessages}
    variant="solid"
    colorScheme="minusxGreen"
    aria-label="Refresh"
    size={'sm'}
    icon={<Icon as={HiOutlineRefresh} boxSize={5} />}
    disabled={messages.length === 0 || taskInProgress}
    />)
  return (
    <VStack
      justifyContent="space-between"
      alignItems="stretch"
      flex={1}
      className="scroll-body"
      height={'80vh'}
      width={"100%"}
      pt={2}
    >
      
      <VStack overflowY={'scroll'}>
        {
          metaQuestion &&
          <>
          <VStack justifyContent={"start"} width={"100%"} p={3} background={"minusxBW.300"} borderRadius={"10px"}>
            <HStack><Text fontWeight={"bold"}>Meta Planner</Text><Spinner size="xs" color="minusxGreen.500" /></HStack>
            <HStack><Text>{metaQuestion}</Text></HStack>
            
          </VStack>
          <Divider borderColor={"minusxBW.500"}/>
          </>
        }
        <ChatSection />
      </VStack>
      <VStack alignItems={"stretch"}>
        <Divider borderColor={"minusxBW.500"}/>
        { !taskInProgress && !userConfirmation.show &&
        <>
        <ChatSuggestions
          suggestQueries={suggestQueries}
          toggleSuggestions={toggleSuggestions}
          suggestions={suggestions} 
          onSuggestionClick={(suggestion) => {
            chat.addUserMessage({
              content: {
                type: "DEFAULT",
                text: suggestion,
                images: []
              },
            })
          }} 
        />
        <Divider borderColor={"minusxBW.500"}/>
        </>
         }
        <Thumbnails thumbnails={thumbnails} />
        <UserConfirmation userConfirmation={userConfirmation}/>
          {
            demoMode && currentTool != "jupyter" && currentTool != "metabase" ? 
            <HStack justify={"center"}>
            <Button onClick={async () => {
              console.log("<><><> button clicked")
              let text = await gdocReadSelected()
              console.log("Text is", text)
              let response = await forwardToTab("jupyter", String(text))
              console.log("Response is", response)
              await gdocWrite(String(response?.response?.text))
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Use Jupyter</Button>
            <Button onClick={async () => {
              console.log("<><><> button clicked")
              let text = await gdocReadSelected()
              console.log("Text is", text)
              let response = await forwardToTab("metabase", String(text))
              console.log("Response is", response)
              await gdocWrite("source", String(response?.url))
              await gdocImage(String(response?.response?.images[0]), 0.5)
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Use Metabase</Button>
            </HStack> : null
          }
          {
            demoMode && currentTool === "jupyter" && (<Button onClick={async ()=>{
              if (instructions) {
                const text = instructions
                setInstructions('')
                setMetaQuestion(text)
                await metaPlanner({text: instructions})
                setMetaQuestion('')
              }
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>I'm feeling lucky</Button>)
          }
        {demoMode && <Button onClick={async () => {
              console.log("<><><> button clicked")
              // let text = await gdocReadSelected()
              const appState = await getApp().getState() as JupyterNotebookState
              const outputCellSelector =  await jupyterQSMap.cell_output;
              const imgs = await getElementScreenCapture(outputCellSelector);

              let response = await forwardToTab("gdoc", {appState, imgs})
              console.log("Response is", response)
              // await gdocWrite(String(response?.response?.text))
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Send to GDoc</Button>
          }   
        {demoMode && <Button onClick={()=>{
          if (instructions) {
            feelinLucky({text: instructions})
            setInstructions('')
          }
        }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>feelin' lucky</Button>
        }
        <HStack>
          <Textarea
            ref={ref}
            autoFocus
            aria-label='Enter Instructions'
            value={instructions}
            disabled={taskInProgress}
            onChange={(e) => setInstructions(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ width: '98%' }}
          />
          <VStack>
            {
              taskInProgress ? (
                <AbortTaskButton abortTask={() => dispatch(abortPlan())} disabled={!taskInProgress}/>
              ) : <RunTaskButton runTask={runTask} disabled={taskInProgress} />
            }
          {
            showMessagesTooLong ?
            <Tooltip hasArrow label={tooLongTooltip} placement='auto' borderRadius={5} defaultIsOpen onClose={() => setShowMessagesTooLong(false)} isDisabled={!showMessagesTooLong}>
              {resetMessageHistoryButton}
            </Tooltip> : 
            <Tooltip hasArrow label="Clear Chat" placement='left' borderRadius={5} openDelay={500}>
              {resetMessageHistoryButton}
            </Tooltip>
          }
          
           
          </VStack>
        </HStack>    
      </VStack>
    </VStack>
  )
})

export default TaskUI
