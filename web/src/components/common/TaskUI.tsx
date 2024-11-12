import {
  HStack,
  Textarea,
  VStack,
  Stack,
  Icon,
  IconButton,
  Divider,
  Tooltip,
  Text,
  Switch,
  Spinner,
  Button
} from '@chakra-ui/react'
import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import RunTaskButton from './RunTaskButton'
import AbortTaskButton from './AbortTaskButton'
import { ChatSection } from './Chat'
import { HiOutlineRefresh } from 'react-icons/hi'
import { BiScreenshot, BiPaperclip } from 'react-icons/bi'
import chat from '../../chat/chat'
import _ from 'lodash'
import { abortPlan, startNewThread } from '../../state/chat/reducer'
import { resetThumbnails, setInstructions as setTaskInstructions } from '../../state/thumbnails/reducer'
import { setSuggestQueries } from '../../state/settings/reducer'
import { RootState } from '../../state/store'
import { getSuggestions } from '../../helpers/LLM/remote'
import { Thumbnails } from './Thumbnails'
import { UserConfirmation } from './UserConfirmation'
import { gdocReadSelected, gdocRead, gdocWrite, gdocImage, queryDOMSingle, readActiveSpreadsheet, getUserSelectedRange, stopRecording, startRecording } from '../../app/rpc'
import { forwardToTab } from '../../app/rpc'
import { metaPlanner } from '../../planner/metaPlan'
import AutosizeTextarea from './AutosizeTextarea'
import { setMinusxMode } from '../../app/rpc'
import { updateAppMode } from '../../state/settings/reducer'
import { UIElementSelection } from './UIElements'
import { capture } from '../../helpers/screenCapture/extensionCapture'
import { addThumbnail } from '../../state/thumbnails/reducer'
import { startSelection } from '../../helpers/Selection'
import { ImageContext } from '../../state/chat/types'
import { QuickActionButton } from './QuickActionButton'
import { ChatSuggestions } from './ChatSuggestions'
import { getParsedIframeInfo } from '../../helpers/origin'
import { VoiceInputButton } from './VoiceInputButton'
import { getTranscripts } from '../../helpers/recordings'
import { configs } from '../../constants'


const TaskUI = forwardRef<HTMLTextAreaElement>((_props, ref) => {
  const currentTool = getParsedIframeInfo().tool
  const currentToolVersion = getParsedIframeInfo().toolVersion
  const isSheets = currentTool == 'google' && currentToolVersion == 'sheets'
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
  const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)

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

  const isMessageTooLong = () => {
    return JSON.stringify(messages).length / 4 > 10000
  }

  const handleSnapClick = async () => {
    await setMinusxMode('open-selection')
    dispatch(updateAppMode('selection'))
    const uiSelection = new UIElementSelection()
    startSelection(async (coords) => {
      const nodes = coords ? uiSelection.getSelectedNodes() : []
      uiSelection.end()
      console.log('Coords are', coords)
      // if (nodes.length >= 0 && coords) {
      if (coords) {
        console.log('Nodes are', nodes, coords)
        try {
          const {url, width, height} = await capture(coords)
          console.log('URL, width, height', url, width, height)
          const context : ImageContext = {
            text: ""
          }
          dispatch(addThumbnail({
            url,
            type: "BASE64",
            width,
            height,
            context,
          }))
        } catch (err) {
          console.log('Error while capturing', err)
        }
      }
      dispatch(updateAppMode('sidePanel'))
      await setMinusxMode(isDevToolsOpen ? 'open-sidepanel-devtools' : 'open-sidepanel')
    }, (coords) => {
      uiSelection.select(coords)
    })
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
    if (configs.VOICE_ENABLED) {
      stopRecording()
    }
  }, [taskInProgress]);

  const isRecording = useSelector((state: RootState) => state.settings.isRecording)
  const voiceInputOnClick = isRecording ? stopRecording : startRecording

  useEffect(() => {
    const interval = setInterval(() => {
      if (isRecording) {
        const transcripts = getTranscripts()
        setInstructions(transcripts.join(''))
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isRecording])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runTask()
    }
  }

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
        { !taskInProgress && !userConfirmation.show && !(currentTool === "google" && currentToolVersion === "sheets") &&
        <>
        <Divider borderColor={"minusxBW.500"}/>
        {isMessageTooLong() ? 
          <Text fontSize="sm" color={"minusxBW.600"}>Long conversations decrease speed and impact accuracy. Consider <HiOutlineRefresh style={{display:"inline-block", verticalAlign: "middle"}}/> this thread.</Text> : 
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
        }
        <Divider borderColor={"minusxBW.500"}/>
        </>
        }
        <Thumbnails thumbnails={thumbnails} />
        <UserConfirmation/>
        {
            demoMode && currentTool == "google" && currentToolVersion == "sheets" ? 
            <HStack justify={"center"}>
            <Button onClick={async () => {
              // const range = await getUserSelectedRange()
              // console.log('Range is', range)
              let text = await readActiveSpreadsheet()
              console.log('Read sheets data', text)
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Read table data</Button>
            <Button onClick={async () => {
              let text = await gdocReadSelected()
              let response = await forwardToTab("metabase", String(text))
              await gdocWrite("source", String(response?.url))
              await gdocImage(String(response?.response?.images[0]), 0.5)
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Write table data</Button>
            </HStack> : null
          }
          {
            demoMode && currentTool == "google" && currentToolVersion == "docs" ? 
            <HStack justify={"center"}>
            <Button onClick={async () => {
              let text = await gdocReadSelected()
              let response = await forwardToTab("jupyter", String(text))
              await gdocWrite(String(response?.response?.text))
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Use Jupyter</Button>
            <Button onClick={async () => {
              let text = await gdocReadSelected()
              let response = await forwardToTab("metabase", String(text))
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
        {/* {demoMode && <Button onClick={async () => {
              // let text = await gdocReadSelected()
              const appState = await getApp().getState() as JupyterNotebookState
              const outputCellSelector =  await jupyterQSMap.cell_output;
              const imgs = await getElementScreenCapture(outputCellSelector);

              let response = await forwardToTab("gdoc", {appState, imgs})
              // await gdocWrite(String(response?.response?.text))
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>Send to GDoc</Button>
          }   
        {demoMode && <Button onClick={()=>{
          if (instructions) {
            feelinLucky({text: instructions})
            setInstructions('')
          }
        }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>feelin' lucky</Button>
        } */}
        <Stack position={"relative"}>
          <AutosizeTextarea
            ref={ref}
            autoFocus
            aria-label='Enter Instructions'
            value={instructions}
            isDisabled={taskInProgress || isRecording}
            onChange={(e) => setInstructions(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ width: '100%', height: "100%" }}
          />
          <HStack position={"absolute"} bottom={0} width={"100%"} p={2}>
            <HStack justify={"space-between"}  width={"100%"}>
              <HStack gap={0}>
                <QuickActionButton tooltip="Add Context (Coming Soon!)" onclickFn={handleSnapClick} icon={BiPaperclip} isDisabled={true}/>
                <VoiceInputButton disabled={taskInProgress} onClick={voiceInputOnClick} isRecording={isRecording}/>
                <QuickActionButton tooltip="Select & Ask" onclickFn={handleSnapClick} icon={BiScreenshot} isDisabled={isSheets || taskInProgress}/>
                <QuickActionButton tooltip="Clear Chat" onclickFn={clearMessages} icon={HiOutlineRefresh} isDisabled={messages.length === 0 || taskInProgress}/>
              </HStack>
              <HStack>
                {
                  taskInProgress ? (
                    <AbortTaskButton abortTask={() => dispatch(abortPlan())} disabled={!taskInProgress}/>
                  ) : <RunTaskButton runTask={runTask} disabled={taskInProgress} />
                }
              </HStack>
              
            </HStack>
          </HStack>
        </Stack>
      </VStack>
    </VStack>
  )
})

export default TaskUI
