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
  Button,
  Checkbox
} from '@chakra-ui/react'
import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import RunTaskButton from './RunTaskButton'
import AbortTaskButton from './AbortTaskButton'
import { ChatSection } from './Chat'
import { BiScreenshot, BiPaperclip, BiMessageAdd, BiEdit, BiTrash, BiBookBookmark, BiTable, BiRefresh } from 'react-icons/bi'
import chat from '../../chat/chat'
import _, { get, isEmpty, isUndefined, sortBy } from 'lodash'
import { abortPlan, startNewThread } from '../../state/chat/reducer'
import { resetThumbnails, setInstructions as setTaskInstructions } from '../../state/thumbnails/reducer'
import { setSuggestQueries, setDemoMode, DEFAULT_TABLES, TableInfo } from '../../state/settings/reducer'
import { RootState } from '../../state/store'
import { getSuggestions } from '../../helpers/LLM/remote'
import { Thumbnails } from './Thumbnails'
import { UserConfirmation } from './UserConfirmation'
import { gdocReadSelected, gdocRead, gdocWrite, gdocImage, queryDOMSingle, readActiveSpreadsheet, getUserSelectedRange, stopRecording, startRecording } from '../../app/rpc'
import { forwardToTab } from '../../app/rpc'
import { metaPlanner } from '../../planner/metaPlan'
import AutosizeTextarea from './AutosizeTextarea'
import { setMinusxMode } from '../../app/rpc'
import { updateAppMode, DevToolsTabName } from '../../state/settings/reducer'
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
import { SemanticLayerViewer } from './SemanticLayerViewer'
import { updateDevToolsTabName, updateIsDevToolsOpen, updateSidePanelTabName } from '../../state/settings/reducer'
import { executeAction } from '../../planner/plannerActions'
import { SettingsBlock } from './SettingsBlock'
import { SupportButton } from './Support'
import { FormattedTable, MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { applyTableDiffs } from "apps";
import { toast } from '../../app/toast'
import { NUM_RELEVANT_TABLES, resetRelevantTables } from './TablesCatalog'
import { setupCollectionsAndModels } from '../../state/settings/availableCatalogsListener'



const useAppStore = getApp().useStore()

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
  const email = useSelector((state: RootState) => state.auth.email)
  const tabName = useSelector((state: RootState) => state.settings.devToolsTabName)
  
  const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog)
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)

  const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)
  const drMode = useSelector((state: RootState) => state.settings.drMode)

  const relevantTables = toolContext.relevantTables || []
  const dbInfo = toolContext.dbInfo

  const allTables = dbInfo.tables || []
  const validAddedTables = applyTableDiffs(allTables, tableDiff, dbInfo.id)
  const [isChangedByDb, setIsChangedByDb] = React.useState<Record<number, boolean>>({}) 

  useEffect(() => {
    dispatch(setupCollectionsAndModels())
  }, [])

  useEffect(() => {
    const currentDbId = dbInfo.id
    if (!isEmpty(relevantTables) && currentDbId) {
      const isCurrentDbChanged = isChangedByDb[currentDbId] || false
      
      if (isEmpty(validAddedTables) && !isCurrentDbChanged) {
        resetRelevantTables(relevantTables.map(table => ({
          name: table.name,
          schema: table.schema,
          dbId: currentDbId
        })), currentDbId)
      }
      
      setIsChangedByDb(prev => ({ ...prev, [currentDbId]: true }))
    }
  }, [relevantTables, dbInfo.id])

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
    return JSON.stringify(messages).length / 4 > 50000
  }

  const handleSnapClick = async () => {
    await setMinusxMode('open-selection')
    dispatch(updateAppMode('selection'))
    const uiSelection = new UIElementSelection()
    startSelection(async (coords) => {
      const nodes = coords ? uiSelection.getSelectedNodes() : []
      uiSelection.end()
      // if (nodes.length >= 0 && coords) {
      if (coords) {
        try {
          const {url, width, height} = await capture(coords)
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

  const updateDemoMode = (value: boolean) => {
    dispatch(setDemoMode(value))
  }

  const runTask = async () => {
    let toastTitle = ''
    let toastDescription = ''
    let preventRunTask = false

    if (instructions === '') {
        toastTitle = 'Invalid Message'
        toastDescription = "Please enter a valid message/question"
        preventRunTask = true
    }
    else if (isUndefined(get(toolContext, 'dbId'))) {
        toastTitle = 'No database selected'
        toastDescription = "Please select a database"
        preventRunTask = true
    }
    else if (toolContext.pageType === 'dashboard' && !drMode) {
        toastTitle = 'Dashboard is supported only in agent mode'
        toastDescription = "You can enable agent mode in settings"
        preventRunTask = true
    }
    else if (selectedCatalog === DEFAULT_TABLES && isEmpty(validAddedTables)) {
        toastTitle = 'No Table in Default Tables'
        toastDescription = "Please select at least one table in Default Tables catalog"
        preventRunTask = true
    }

    if (preventRunTask) {
        return toast({
            title: toastTitle,
            description: toastDescription,
            status: 'warning',
            duration: 5000,
            isClosable: true,
            position: 'bottom-right',
        })
    }

    if (instructions) {
      const text = instructions
      setInstructions('')
      if (demoMode && currentTool === "jupyter") {
        setMetaQuestion(instructions)
        await metaPlanner({text: instructions})
        setMetaQuestion('')
      } 
      else {
        chat.addUserMessage({
          content: {
            type: "DEFAULT",
            text: instructions,
            images: thumbnails
          },
        })
        dispatch(resetThumbnails())
      }
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
    stopRecording()
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

  const openDevtoolTab = async (devtoolsTab: DevToolsTabName) => {
    if (isDevToolsOpen) {
      if (tabName === devtoolsTab) {
        dispatch(updateIsDevToolsOpen(false))
        await setMinusxMode('open-sidepanel')
      } else {
        dispatch(updateDevToolsTabName(devtoolsTab))
      }
    } else {
      dispatch(updateIsDevToolsOpen(true))
      dispatch(updateDevToolsTabName(devtoolsTab))
      await setMinusxMode('open-sidepanel-devtools')
    }
  }

  const clearSQL = async () => {
    await executeAction({
      index: -1,
      function: 'updateSQLQuery',
      args: '{"sql":"","executeImmediately":false}'
    });
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
        { !userConfirmation.show && !(currentTool === "google" && currentToolVersion === "sheets") &&
        <>
          {/* <Divider borderColor={"minusxBW.500"}/> */}
          {isMessageTooLong() && <Text fontSize="sm" color={"minusxBW.600"}>Long conversations decrease both speed and accuracy. Consider starting a new chat thread (click <BiMessageAdd style={{display:"inline-block", verticalAlign: "middle"}}/> at the top right corner).</Text>}
            {/* <ChatSuggestions
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
            /> */}
          { configs.IS_DEV && demoMode && currentTool === "metabase" && <SemanticLayerViewer/> }
          <Divider borderColor={"minusxBW.500"}/>
        </>
        }
        <Thumbnails thumbnails={thumbnails} />
        <UserConfirmation/>
        {/* {
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
          } */}
          {/* {
            demoMode && currentTool === "jupyter" && (<Button onClick={async ()=>{
              if (instructions) {
                const text = instructions
                setInstructions('')
                setMetaQuestion(text)
                await metaPlanner({text: instructions})
                setMetaQuestion('')
              }
            }} colorScheme="minusxGreen" size="sm" disabled={taskInProgress}>I'm feeling lucky</Button>)
          } */}
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
        <SettingsBlock title='Quick Actions'>
        <HStack flexWrap={"wrap"} gap={1}>
          { currentTool == 'metabase' && <Button size="xs" leftIcon={<BiBookBookmark size={14}/>} colorScheme="minusxGreen" variant="solid" as="a" href="https://docs.minusx.ai/en/collections/10790008-minusx-in-metabase" target="_blank">Docs</Button> }
          { currentTool == 'metabase'  && <Button size="xs" leftIcon={<BiTable size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={()=>openDevtoolTab("Context")}>Context</Button> }
          { <Button size="xs" leftIcon={<BiMessageAdd size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={clearMessages}>New Chat</Button> }
          {/* { currentTool == 'metabase'  && <Button size="xs" leftIcon={<BiEdit size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={()=>openDevtoolTab("Custom Instructions")}>Custom Instructions</Button> } */}
          {/* { currentTool == 'metabase' && configs.IS_DEV && <Button size="xs" leftIcon={<BiTrash size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={clearSQL}>Clear SQL</Button> } */}
          <SupportButton email={email} />

        </HStack>
        </SettingsBlock>
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
                {/* <VoiceInputButton disabled={taskInProgress} onClick={voiceInputOnClick} isRecording={isRecording}/> */}
                {/* <QuickActionButton tooltip="Select & Ask" onclickFn={handleSnapClick} icon={BiScreenshot} isDisabled={isSheets || taskInProgress}/> */}
                {/* <QuickActionButton tooltip="Clear Chat" onclickFn={clearMessages} icon={BiRefresh} isDisabled={messages.length === 0 || taskInProgress}/> */}
                { currentTool == 'metabase'  && <Button size="xs" colorScheme="minusxGreen" borderWidth={1} borderColor="minusxGreen.600" variant="ghost" onClick={()=>openDevtoolTab("Context")}>"{selectedCatalog.slice(0, 20)}" in context</Button> }
                {configs.IS_DEV &&false&& <Checkbox sx={{
                  '& input:not(:checked) + span': {
                    borderColor: 'minusxBW.500',
                  },
                  '& input:checked + span': {
                    bg: 'minusxGreen.500',
                    borderColor: 'minusxGreen.500',
                  },
                  '& input:checked:hover + span': {
                    bg: 'minusxGreen.500',
                    borderColor: 'minusxGreen.500',
                  },
                  span:{
                    marginLeft: 1,
                  }
                  }}
                  isChecked={demoMode}
                  onChange={(e) => updateDemoMode(e.target.checked)}
                >
                  <Text fontSize="xs">Advanced Mode</Text>
                </Checkbox>
                }
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
