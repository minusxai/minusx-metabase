import {
  HStack,
  VStack,
  Icon,
  Divider,
  Tooltip,
  Text,
  Spinner,
  Button,
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react'
import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ChatSection } from './Chat'
import { BiTable, BiStopCircle, BiMemoryCard, BiGroup, BiSolidCheckCircle, BiSolidXCircle, BiSolidHand, BiSolidMagicWand, BiChevronDown } from 'react-icons/bi'
import {  BsDatabaseCheck } from 'react-icons/bs'
import chat from '../../chat/chat'
import _, { every, get, isEmpty, isEqual, isUndefined, pick, sortBy } from 'lodash'
import { abortPlan, clearTasks, startNewThread, updateLastWarmedOn, cloneThreadFromHistory } from '../../state/chat/reducer'
import { resetThumbnails, setInstructions as setTaskInstructions } from '../../state/thumbnails/reducer'
import { setSuggestQueries } from '../../state/settings/reducer'
import { RootState } from '../../state/store'
import { getSuggestions } from '../../helpers/LLM/remote'
import { simplePlan } from '../../planner/simplePlan'
import { Thumbnails } from './Thumbnails'
import { UserConfirmation } from './UserConfirmation'
import { Clarification } from './Clarification'
import { stopRecording, startRecording } from '../../app/rpc'
import { metaPlanner } from '../../planner/metaPlan'
import { setMinusxMode } from '../../app/rpc'
import { updateAppMode, DevToolsTabName } from '../../state/settings/reducer'
import { UIElementSelection } from './UIElements'
import { capture } from '../../helpers/screenCapture/extensionCapture'
import { addThumbnail } from '../../state/thumbnails/reducer'
import { startSelection } from '../../helpers/Selection'
import { ImageContext } from '../../state/chat/types'
import { getParsedIframeInfo } from '../../helpers/origin'
import { getTranscripts } from '../../helpers/recordings'
import { configs } from '../../constants'
import { SemanticLayerViewer } from './SemanticLayerViewer'
import { updateDevToolsTabName, updateIsDevToolsOpen, updateSidePanelTabName } from '../../state/settings/reducer'
import { executeAction } from '../../planner/plannerActions'
import { SettingsBlock } from './SettingsBlock'
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { applyTableDiffs, getCurrentQuery, getSelectedAndRelevantModels } from "apps";
import { toast } from '../../app/toast'
import { NUM_RELEVANT_TABLES, resetRelevantTables } from './TablesCatalog'
import { Notify } from './Notify'
import { Markdown } from './Markdown'
import ChatInputArea from './ChatInputArea'
import { Suggestions } from './Suggestions';



const app = getApp()
const useAppStore = app.useStore()
const LOW_CREDITS_THRESHOLD = 15

const TaskUI = forwardRef<HTMLTextAreaElement>((_props, ref) => {
  const currentTool = getParsedIframeInfo().tool
  const currentToolVersion = getParsedIframeInfo().toolVersion
  const instructions = useSelector((state: RootState) => state.thumbnails.instructions)
  const [metaQuestion, setMetaQuestion] = useState<string>("")
  const thumbnails = useSelector((state: RootState) => state.thumbnails.thumbnails)
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const lastWarmedOn = useSelector((state: RootState) => state.chat.last_warmed_on)
  const totalThreads = useSelector((state: RootState) => state.chat.threads.length)
  const suggestQueries = useSelector((state: RootState) => state.settings.suggestQueries)
  const demoMode = useSelector((state: RootState) => state.settings.demoMode)
  const messages = activeThread.messages
  const userConfirmation = activeThread.userConfirmation
  const dispatch = useDispatch()
  const taskInProgress = !(activeThread.status == 'FINISHED')
  const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)
  const email = useSelector((state: RootState) => state.auth.email)
  const tabName = useSelector((state: RootState) => state.settings.devToolsTabName)
  
  const currentCatalogEntities: any[] = [];
    
    
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const dbInfo = toolContext.dbInfo
  const toolEnabled = useAppStore((state) => state.isEnabled)
  const selectedModels = useSelector((state: RootState) => state.settings.selectedModels)
  // only take models for the current db id
  const validSelectedModels = selectedModels.filter(model => model.dbId === dbInfo.id)

  const handleDatabaseSelect = useCallback(async (dbId: number) => {
    await app.manuallySelectDb(dbId)
  }, [])

  const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)
  const drMode = useSelector((state: RootState) => state.settings.drMode)
  const useMemory = useSelector((state: RootState) => state.settings.useMemory)
  const useTeamMemory = useSelector((state: RootState) => state.settings.useTeamMemory)
  const manuallyLimitContext = useSelector((state: RootState) => state.settings.manuallyLimitContext)
  const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
  const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
  const selectedAssetName = availableAssets.find(asset => asset.slug === selectedAssetId)?.name || 'None'
      

  const credits = useSelector((state: RootState) => state.billing.credits)
  const infoLoaded = useSelector((state: RootState) => state.billing.infoLoaded)
  const analystMode = useSelector((state: RootState) => state.settings.analystMode)
  const proUser = useSelector((state: RootState) => state.billing.isSubscribed)
  const enterpriseUser = useSelector((state: RootState) => state.billing.isEnterpriseCustomer)

  const creditsExhausted = () => (credits <= 0 && infoLoaded)
  const creditsLow = () => (credits <= LOW_CREDITS_THRESHOLD && infoLoaded)
  // approx check if this is a new user
  const newUserProxy = () => (credits >= 200 && infoLoaded && credits <= 300) && !proUser && !enterpriseUser && messages.length < 2
  const lastThread = () => (thread === totalThreads - 1)

  const relevantTables = toolContext.relevantTables || []

  const allTables = dbInfo.tables || []
  const validAddedTables = applyTableDiffs(allTables, tableDiff, dbInfo.id)

  // ToDo: Vivek - this is ugly, but it works for now
  // This needs to be consolidated and done in one place
  const entitiesInContext = currentCatalogEntities.length > 0 ? currentCatalogEntities.length : validAddedTables.length + validSelectedModels.length
  
  const [isChangedByDb, setIsChangedByDb] = React.useState<Record<number, boolean>>({}) 


  const allDBs = get(toolContext, 'allDBs', [])
  useEffect(() => {
    const interval = setInterval(() => {
      if (isEmpty(allDBs)) {
        app.triggerStateUpdate()
      } else {
        clearInterval(interval)
      }
    }, 600)
    return () => clearInterval(interval)
  }, [allDBs])

  useEffect(() => {
    const currentDbId = dbInfo.id
    if (!isEmpty(relevantTables) && currentDbId) {
      const isCurrentDbChanged = isChangedByDb[currentDbId] || false
      
      if ((isEmpty(validAddedTables) && isEmpty(validSelectedModels)) && !isCurrentDbChanged) {
        resetRelevantTables(relevantTables.map(table => ({
          name: table.name,
          schema: table.schema,
          dbId: currentDbId
        })), currentDbId)
      } else if (every(validAddedTables.map((table, index) => isEqual(
        pick(allTables[index], ['name', 'schema']),
        pick(table, ['name', 'schema'])  
      )))) {
        // #HACK to reset relevant tables for alphabetical relevancy bug
        if (validAddedTables.length == NUM_RELEVANT_TABLES) {
          resetRelevantTables(relevantTables.map(table => ({
            name: table.name,
            schema: table.schema,
            dbId: currentDbId
          })), currentDbId)
        }
      }      
      setIsChangedByDb(prev => ({ ...prev, [currentDbId]: true }))
    }
  }, [relevantTables, dbInfo.id])

  // Debounced instructions update logic moved to ChatInputArea component

  // Prewarm logic
  useEffect(() => {
    if (instructions.length <= 5) {
      return; // Don't prewarm if input too short or already prewarming
    }

    const HRS_THRESHOLD = 1 * 1000 * 60 * 60;
    const now = Date.now();

    // Check if we should prewarm (only check last_warmed_on)
    const shouldPrewarm = !lastWarmedOn || lastWarmedOn == 0 || (now - lastWarmedOn) > HRS_THRESHOLD;

    if (shouldPrewarm) {
      dispatch(updateLastWarmedOn());
      // Fire-and-forget prewarm request
      app.getPlannerConfig().then(plannerConfig => {
        simplePlan(new AbortController().signal, plannerConfig, true) // isPrewarm = true
          .catch(error => console.warn('Prewarm failed:', error)); // Don't show error to user
      });
      // Update last_warmed_on immediately and reset prewarming state
    }
  }, [instructions, lastWarmedOn]);

  const clearMessages = () => {
    if (taskInProgress) {
      dispatch(abortPlan())
    }
    dispatch(startNewThread())
  }

  const continueThread = () => {
    // Clone the current thread (excluding the active one) and make it the active thread
    dispatch(cloneThreadFromHistory({
      sourceThreadIndex: thread,
      upToMessageIndex: messages.length - 1
    }))
  }

  const toggleSuggestions = (value: boolean) => {
    dispatch(setSuggestQueries(value))
  }

  const isMessageTooLong = () => {
    return messages.length >= 10 && JSON.stringify(messages).length / 4 > 30000
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

  // updateDemoMode logic moved to ChatInputArea component

  const runTask = async (instructions: string) => {
    let toastTitle = ''
    let toastDescription = ''
    let preventRunTask = false

    if (instructions === '') {
        toastTitle = 'Invalid Message'
        toastDescription = "Please enter a valid message/question"
        preventRunTask = true
    }
    else if (isUndefined(get(toolContext, 'dbId')) && toolContext.pageType == 'sql') {
        toastTitle = 'No database selected'
        toastDescription = "You can select a specific database to use in the top left corner of the SQL editor"
        preventRunTask = true
    }
    else if (isUndefined(get(toolContext, 'dbId')) && toolContext.pageType == 'mbql') {
        toastTitle = 'No database selected'
        toastDescription = "You can select a specific database by selecting any table / model as data source"
        preventRunTask = true
    }
    else if (isUndefined(get(toolContext, 'dbId')) && toolContext.pageType == 'dashboard') {
        toastTitle = 'No database selected'
        toastDescription = "We can't tell which database to use! You can select a database either in the SQL editor or by selecting a table or model in the MBQL editor"
        preventRunTask = true
    }
    else if (isUndefined(get(toolContext, 'dbId')) && toolContext.pageType == 'unknown') {
        toastTitle = 'No database selected'
        toastDescription = "We can't tell which database to use! You can select a database by navigating to a dashboard, the SQL editor, or the MBQL editor"
        preventRunTask = true
    }
    else if (toolContext.pageType === 'dashboard' && (!drMode)) {
        toastTitle = 'Dashboard is supported only by the Simple or Explorer agents'
        toastDescription = "You can enable either agent in settings"
        preventRunTask = true
    }
    else if (toolContext.pageType === 'mbql' && (!drMode)) {
        toastTitle = 'MBQL Editor is supported only by the Simple or Explorer agents'
        toastDescription = "You can enable either agent in settings"
        preventRunTask = true
    }
    else if (isEmpty(validAddedTables) && isEmpty(validSelectedModels) && !analystMode) {
        toastTitle = 'No Tables Selected'
        toastDescription = "Please select at least one table"
        preventRunTask = true
    }
    else if (creditsExhausted()) {
        toastTitle = 'Credits exhausted'
        toastDescription = "Go to settings to purchase a Pro subscription."
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
    // parse the sql query and check if it has any models in it
    // add it to selectedModels if so
    // actually not doing this right now, maybe later
    // if (toolContext.pageType === 'sql') {
    //   const sqlQuery = await getCurrentQuery()
    //   const allModels = toolContext.dbInfo.models
    //   const relevantModels = await getSelectedAndRelevantModels(sqlQuery || "",  selectedModels, allModels)
    //   // check if relevantModels is different from selectedModels
    //   if (!isEqual(relevantModels, selectedModels)) {
    //     // dispatch the relevant models to be the new selectedModels
    //     dispatch(setSelectedModels(relevantModels))
    //   }
    // }

    if (instructions) {
      const text = instructions
      dispatch(setTaskInstructions(''))
      if (demoMode && currentTool === "jupyter") {
        setMetaQuestion(text)
        await metaPlanner({text})
        setMetaQuestion('')
      } 
      else {
        dispatch(clearTasks())
        chat.addUserMessage({
          content: {
            type: "DEFAULT",
            text,
            images: thumbnails
          },
        })
        dispatch(resetThumbnails())
      }
    }
  }
  
  // suggestions stuff
  const [suggestions, setSuggestions] = useState<string[]>([]);

//   const setSuggestionsDebounced = useCallback(
//     _.debounce(async() => {
//       const suggestions = await getSuggestions()
//       setSuggestions(suggestions)
//     }, 500),
//     []
//   );
//   useEffect(() => {
//     setSuggestions([]);
//     if (!taskInProgress && suggestQueries) {
//       setSuggestionsDebounced()
//       return () => setSuggestionsDebounced.cancel();
//     }
//   }, [messages, taskInProgress, setSuggestionsDebounced, suggestQueries]);

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
        dispatch(setTaskInstructions(transcripts.join('')))
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isRecording])

  // onKeyDown logic moved to ChatInputArea component

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

//   const clearSQL = async () => {
//     await executeAction({
//       index: -1,
//       function: 'updateSQLQuery',
//       args: '{"sql":"","executeImmediately":false}'
//     });
//   }

  const shouldBeEnabled = (drMode || toolContext.pageType === 'sql')
    
    const getAlertStatus = () => {
        // 1. All cases when the input box should be disabled, and an alert shown
        if (!toolEnabled?.value || false){
            return {
                inputBox: false,
                alert: {
                    message: toolEnabled.reason || "MinusX is not enabled for this app.",
                    type: "error",
                    title: "MinusX unavailable on this page!"
                }
            };

        }
        if (!shouldBeEnabled) {
            return {
                inputBox: false,
                alert: {
                    message: "You're currently using **MinusX Classic Agent**, which only works on SQL Editor pages. [Find out](https://minusx.ai/demo) how to enable Agent mode and unlock all the features!",
                    type: "error",
                    title: "Try Agent Mode!"
                }
            };
        }

        if (!lastThread()) {
            return {
                inputBox: false,
                alert: {
                    message: "You're viewing an older thread. Please start a new thread to continue.",
                    type: "warning",
                    title: "Previous Thread",
                    showContinueButton: true
                }
            };
        }
        
        if (creditsExhausted()) {
            return {
                inputBox: false,
                alert: {
                    message: "You've exhausted your credits for the week. You can either upgrade to a Pro subscription in settings or [talk to us](https://minusx.ai/demo) and get 1 month free Pro!",
                    type: "error",
                    title: "Uh Oh! Credits Exhausted"
                }
            };
        }

        // 2. All cases when the input box should be enabled, but an alert shown
        // if (toolContext.pageType === 'mbql'){
        //     return {
        //         inputBox: true,
        //         alert: {
        //             message: "Question Builder feature is new and still in progress. Some things might not work just yet.",
        //             type: "info",
        //             title: "Try Question Builder!"
        //         }
        //     }
        // }
        if (!drMode) {
            return {
                inputBox: false,
                alert: {
                    message: "You're currently using **MinusX Classic Agent**, which is deprecated. [Find out](https://minusx.ai/demo) how the Explorer Agent can unlock exciting new features!",
                    type: "error",
                    title: "Try Explorer Agent!"
                }
            };
        }
        if (!analystMode) {
            return {
                inputBox: true,
                alert: {
                    message: "You're currently using **MinusX Simple Agent**. [Find out](https://minusx.ai/demo) how the Explorer Agent can unlock exciting new features!",
                    type: "warning",
                    title: "Try Explorer Agent!"
                }
            };
        }
        if (creditsLow()) {
            return {
                inputBox: true,
                alert: {
                    message: "Running low on credits. You can either upgrade to a Pro subscription in settings or [talk to us](https://minusx.ai/demo) and get 1 month free Pro!",
                    type: "warning",
                    title: "Uh Oh! Running Low on Credits"
                }
            };
        }
        if (newUserProxy()) {
            return {
                inputBox: true,
                alert: {
                    message: "Welcome to MinusX! Since we like you so much, we are giving you **250 free credits** this week to try out the product! Happy querying!",
                    type: "info",
                    title: "Bonus credits, yay!"
                }
            };
        }

        // 3. All cases when the input box should be enabled, and no alert shown
        return {
            inputBox: true,
            alert: {
                type: null,
            }
        };
    }

    const appEnabledStatus = getAlertStatus()

  return (
    <>
    <VStack
      justifyContent="space-between"
      alignItems="stretch"
      flex={1}
      className="scroll-body"
      height={'80vh'}
      width={"100%"}
      pt={2}
    >
      
      <VStack overflowY={'auto'} height={"100%"}>
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
          {isMessageTooLong() && <Notify title="Conversation Too Long" notificationType='warning'>
                <Text fontSize="xs" lineHeight={"1rem"}>
                    Your chat is too long, reducing accuracy and costing you more credits. Click
            {" "}<Text
              as="span"
              color="blue.500"
              textDecoration="underline"
              cursor="pointer"
              _hover={{ color: "blue.700" }}
              onClick={clearMessages}
            >
              here
            </Text>{" "} to start a new thread.</Text>
            </Notify>
            }
          { configs.IS_DEV && demoMode && currentTool === "metabase" && <SemanticLayerViewer/> }
          <Divider borderColor={"minusxBW.500"}/>
        </>
        }
        <Thumbnails thumbnails={thumbnails} />
        <UserConfirmation/>
        <Clarification/>
        {/* {
            savedQuestions.length > 0 && !taskInProgress && showSavedQuestions &&
            <Suggestions title="Saved Questions" suggestions={savedQuestions} />
        } */}
        
        {
            appEnabledStatus.alert.type && 
            <Notify title={appEnabledStatus.alert.title} notificationType={appEnabledStatus.alert.type}>
                <VStack spacing={2} alignItems="stretch">
                    <Text fontSize="xs" lineHeight={"1rem"}>
                        <Markdown content={appEnabledStatus.alert.message} />
                    </Text>
                    {appEnabledStatus.alert.showContinueButton && (
                        <Button
                            size="xs"
                            colorScheme="minusxGreen"
                            variant="solid"
                            onClick={continueThread}
                        >
                            Continue this thread
                        </Button>
                    )}
                </VStack>
            </Notify>
        }
        {/* {   !taskInProgress &&
            <SettingsBlock title='Quick Actions' ariaLabel='quick-actions'>
                <HStack justifyContent={"center"} flexWrap={"wrap"} gap={1}>
                { currentTool == 'metabase' && <Button size="xs" leftIcon={<BiBookBookmark size={14}/>} colorScheme="minusxGreen" variant="solid" as="a" href="https://docs.minusx.ai/en/collections/10790008-minusx-in-metabase" target="_blank">Docs</Button> }
                { currentTool == 'metabase'  && <Button size="xs" leftIcon={<BiTable size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={()=>openDevtoolTab("Context")}>Context</Button> }
                { <Button size="xs" leftIcon={<BiMessageAdd size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={clearMessages}>New Chat</Button> }
                { <Button size="xs" leftIcon={<BiMemoryCard size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={()=>openDevtoolTab("Memory")}>Memory</Button> }
                { <Button size="xs" leftIcon={<BiGroup size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={()=>openDevtoolTab("Team Memory")}>Team</Button> }
                { currentTool == 'metabase'  && <Button size="xs" leftIcon={<BiEdit size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={()=>openDevtoolTab("Custom Instructions")}>Custom Instructions</Button> }
                { currentTool == 'metabase' && configs.IS_DEV && <Button size="xs" leftIcon={<BiTrash size={14}/>} colorScheme="minusxGreen" variant="solid" onClick={clearSQL}>Clear SQL</Button> }
                <SupportButton email={email} />

                </HStack>
            </SettingsBlock>
        } */}

        {   !taskInProgress &&
            <SettingsBlock title='Context' ariaLabel='context-info'>
                <VStack gap={2}>
                    {/* Option 2: Improved Card Style with Icon */}
                    <Box 
                        bg="minusxBW.200" 
                        px={2} 
                        py={1} 
                        borderRadius="md" 
                        width="100%"
                        borderLeft="3px solid"
                        borderLeftColor={toolContext?.dbId ? "minusxGreen.500" : "red.400"}
                    >
                        <HStack spacing={1} alignItems="center" justifyContent="space-between">
                            <HStack spacing={1}>
                                <Icon as={BsDatabaseCheck} size={12} color="gray.600" />
                                <Text fontSize="xs" fontWeight="medium" color="gray.600">Database</Text>
                            </HStack>
                            <Tooltip
                                hasArrow
                                placement="top"
                                borderRadius={5}
                                label={(() => {
                                    const currentDb = toolContext?.allDBs?.find((db: any) => db.id === toolContext?.dbId);
                                    if (!currentDb) return 'No database selected';
                                    return `${currentDb.name} (ID: ${currentDb.id})`;
                                })()}
                            >
                                <Text 
                                    fontSize="xs" 
                                    fontWeight="bold"
                                    maxWidth="200px"
                                    isTruncated
                                >
                                    {toolContext?.allDBs?.find((db: any) => db.id === toolContext?.dbId)?.name || 'None'}
                                </Text>
                            </Tooltip>
                        </HStack>
                    </Box>
                    <HStack justifyContent="space-between" fontSize="sm" gap={1} width={"100%"}>
                        {/* <Tooltip 
                            hasArrow 
                            placement='right' 
                            borderRadius={5} 
                            label={`${manuallyLimitContext ? 'Manual' : 'Automatic'} table selection`}
                        >
                            
                            <Box 
                                bg="minusxBW.200" 
                                px={2} 
                                py={1} 
                                borderRadius="md" 
                                cursor="pointer" 
                                _hover={{bg: "minusxBW.100"}}
                                onClick={()=>openDevtoolTab("Context")}
                            >
                                <VStack spacing={0} alignItems="center" justifyContent={"center"}>
                                    <HStack spacing={1}>
                                        <Icon as={BiTable} size={12} color="gray.600" />
                                        <Text fontSize="xs" fontWeight="medium">Tables</Text>
                                    </HStack>
                                    <HStack spacing={1} alignItems="center">
                                        <Text fontSize="xs" color="gray.500">{manuallyLimitContext ? 'Manual' : 'Auto'}</Text>
                                        <Icon 
                                            as={manuallyLimitContext ? BiSolidHand : BiSolidMagicWand} 
                                            size={10} 
                                            color={manuallyLimitContext ? "red.500" : "minusxGreen.500"}
                                        />
                                    </HStack>
                                </VStack>
                            </Box>
                        </Tooltip> */}
                        <Tooltip 
                            hasArrow 
                            placement='top' 
                            borderRadius={5} 
                            label={`Personal memory is ${useMemory ? 'enabled' : 'disabled'}`}
                        >
                            <Box 
                                flex={1}
                                bg="minusxBW.200" 
                                px={2} 
                                py={1} 
                                borderRadius="md" 
                                cursor="pointer" 
                                _hover={{bg: "minusxBW.100"}}
                                onClick={()=>openDevtoolTab("Memory")}
                            >
                                <VStack spacing={0} alignItems="center" justifyContent={"center"}>
                                    <HStack spacing={1}>
                                        <Icon as={BiMemoryCard} size={12} color="gray.600" />
                                        <Text fontSize="xs" fontWeight="medium">Memory</Text>
                                    </HStack>
                                    <HStack spacing={1} alignItems="center">
                                        <Text fontSize="xs" color="gray.500">{useMemory ? 'Enabled' : 'Disabled'}</Text>
                                        <Icon 
                                            as={useMemory ? BiSolidCheckCircle : BiSolidXCircle} 
                                            size={10} 
                                            color={useMemory ? "minusxGreen.500" : "red.500"} 
                                        />
                                    </HStack>
                                </VStack>
                            </Box>
                        </Tooltip>
                        <Tooltip 
                            hasArrow 
                            placement='top' 
                            borderRadius={5} 
                            label={`Team memory is ${useTeamMemory ? 'enabled' : 'disabled'}`}
                        >
                            <Box 
                                bg="minusxBW.200"
                                flex={1}
                                px={2} 
                                py={1} 
                                borderRadius="md" 
                                cursor="pointer" 
                                _hover={{bg: "minusxBW.100"}}
                                onClick={()=>openDevtoolTab("Team Memory")}
                            >
                                <VStack spacing={0} alignItems="center" justifyContent={"center"}>
                                    <HStack spacing={1}>
                                        <Icon as={BiGroup} size={12} color="gray.600" />
                                        <Text fontSize="xs" fontWeight="medium">Team Memory</Text>
                                    </HStack>
                                    <HStack spacing={1} alignItems="center">
                                        <Text fontSize="xs" color="gray.500">{useTeamMemory ? (selectedAssetName.length > 8 ? `${selectedAssetName.slice(0, 12)}...` : selectedAssetName) : 'Disabled'}</Text>
                                        <Icon 
                                            as={useTeamMemory ? BiSolidCheckCircle : BiSolidXCircle}
                                            size={10} 
                                            color={useTeamMemory ? "minusxGreen.500" : "red.500"} 
                                        />
                                    </HStack>
                                </VStack>
                            </Box>
                        </Tooltip>
                    </HStack>
                </VStack>
            </SettingsBlock>
        }

        <VStack width={"100%"} alignItems={"stretch"} gap={0}>
        { !taskInProgress && (!isUndefined(get(toolContext, 'dbId'))) && 
          <ChatInputArea
            ref={ref}
            isRecording={isRecording}
            runTask={runTask}
            appEnabledStatus={appEnabledStatus}
          />
        }
        {
            isUndefined(get(toolContext, 'dbId')) && 
            <Box p={4} bg={"minusxBW.200"} borderRadius={"8px"} textAlign={"center"}>
                <Text fontSize={"sm"} color={"gray.500"} mb={3}>We're unable to auto-select your Database. Pick one to get started</Text>
                <Box display="flex" justifyContent="center">
                    <Menu placement="bottom">
                        <MenuButton 
                            as={Button} 
                            rightIcon={<BiChevronDown />} 
                            size="xs" 
                            variant="solid" 
                            colorScheme='minusxGreen'
                            onClick={() => {
                                const allDBs = get(toolContext, 'allDBs', [])
                                if (isEmpty(allDBs)) {
                                  app.triggerStateUpdate()
                                }
                            }}
                        >
                            Choose a Database
                        </MenuButton>
                        <MenuList maxH="200px" overflowY="auto">
                            {get(toolContext, 'allDBs', []).map((db: any) => (
                                <MenuItem 
                                    key={db.id} 
                                    onClick={() => handleDatabaseSelect(db.id)}
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                >
                                    <Text fontWeight="medium">{db.name}</Text>
                                    <Text fontSize="xs" color="gray.500">ID: {db.id}</Text>
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Box>
            </Box>
        }
        {taskInProgress && (
          <HStack aria-label="stop-task-area" justifyContent="center" width="100%" py={2}>
            <Button
              aria-label="stop-task-button"
              colorScheme="minusxGreen"
              size="sm"
              leftIcon={<BiStopCircle />}
              onClick={() => dispatch(abortPlan())}
              w={"100%"}
            >
              Stop Task
            </Button>
          </HStack>
        )}
        </VStack>
      </VStack>
    </VStack>
    </>
  )
})

export default TaskUI
