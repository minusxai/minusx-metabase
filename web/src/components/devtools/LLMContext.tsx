import React, { useEffect, useState } from 'react';
import { Box, HStack, Text, Select, Button } from '@chakra-ui/react';
import { getLLMContextFromState } from '../../planner/utils';
import ReactJson from 'react-json-view'
import { UserChatMessage } from '../../state/chat/reducer';
// import { getEncoding, getEncodingNameForModel } from "js-tiktoken";
import { getMetabaseState } from '../../app/rpc';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import {
  Tiktoken,
  TiktokenBPE,
  TiktokenEncoding,
  TiktokenModel,
  getEncodingNameForModel,
} from "js-tiktoken";
import { configs } from '../../constants';
import { getApp } from '../../helpers/app';
import { getParsedIframeInfo } from '../../helpers/origin';
import { AppState } from 'apps/types';
import { dispatch } from '../../state/dispatch';
import { switchToThread } from '../../state/chat/reducer';
const cache: Record<string, TiktokenBPE> = {};

async function getEncoding(
  encoding: TiktokenEncoding,
  extendedSpecialTokens?: Record<string, number>
) {
  if (!(encoding in cache)) {
    const res = await fetch(`${configs.WEB_URL}/${encoding}.json`);

    if (!res.ok) throw new Error("Failed to fetch encoding");
    cache[encoding] = await res.json();
  }
  return new Tiktoken(cache[encoding], extendedSpecialTokens);
}

async function encodingForModel(
  model: TiktokenModel,
  extendedSpecialTokens?: Record<string, number>
) {
  return getEncoding(getEncodingNameForModel(model), extendedSpecialTokens);
}

export const LLMContext: React.FC<null> = () => {
    const [metabaseReduxState, setMetabaseReduxState] = useState<object>({})
    const [appState, setAppState] = useState<object>({})
    const [tokenCounts, setTokenCounts] = useState<Record<string, number>>({
      systemMessageTokens: 0,
      userMessageTokens: 0,
      assistantMessageTokens: 0,
      toolMessageTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      restTokens: 0,
      actionDescriptionsTokens: 0,
    })
    const numThreads = useSelector((state: RootState) => state.chat.threads.length)
    // const messageHistory = activeThread.messages.slice(0)
    const messageHistory = useSelector((state: RootState) => state.chat.threads[state.chat.activeThread].messages)
    const thumbnailInstructions = useSelector((state: RootState) => state.thumbnails.instructions)
    const lastMessage: UserChatMessage = {
      role: 'user',
      content: {
        text: thumbnailInstructions,
        type: 'DEFAULT',
        images: []
      },
      index: messageHistory.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      feedback: {
        reaction: 'unrated',
      },
      debug: {}
    }
    const [resolvedPlannerConfig, setResolvedPlannerConfig] = useState(getApp().useStore().getState().llmConfigs.default)
    const tool = getParsedIframeInfo().tool
    
    const getTokensForAppState = async(appState: any, enc: any) => {
      const appStateTokens = await enc.encode(JSON.stringify(appState)).length
      let inputTokens = 0
      let outputTokens = 0
      if (tool === 'jupyter') {
        const cellInputs = appState.cells.map((cell: any) => cell.source)
        const cellOutputs = appState.cells.map((cell: any) => cell.output)
        inputTokens = await enc.encode(JSON.stringify(cellInputs)).length || 0
        outputTokens = await enc.encode(JSON.stringify(cellOutputs)).length || 0
      }
      if (tool === 'metabase') {
        inputTokens = await enc.encode(JSON.stringify(appState.sqlQuery)).length
        outputTokens = await enc.encode(JSON.stringify(appState.outputTableMarkdown)).length
      }
      const restTokens = appStateTokens - inputTokens - outputTokens
      return {inputTokens, outputTokens, restTokens}
    }

    const countAllTokens = async (systemMessage: any, nonSystemMessages: any, appState: any, actionDescriptions: any) => {
      const userMessages = nonSystemMessages.filter((message: any) => message.role === 'user')
      const assistantMessages = nonSystemMessages.filter((message: any) => message.role === 'assistant')
      const toolMessages = nonSystemMessages.filter((message: any) => message.role === 'tool')

      if (!appState) {
        return
      }
      // ToDo Vivek: get model name from state
      // Also ToDo Vivek: update frontend/web/public/ with model encodings
      const model_name = "gpt-4o"
      const enc = await encodingForModel(model_name)
      const systemMessageTokens = await enc.encode(JSON.stringify(systemMessage)).length
      const userMessageTokens = await enc.encode(JSON.stringify(userMessages)).length
      const assistantMessageTokens = await enc.encode(JSON.stringify(assistantMessages)).length
      const toolMessageTokens = await enc.encode(JSON.stringify(toolMessages)).length
      const actionDescriptionsTokens = await enc.encode(JSON.stringify(actionDescriptions)).length
      
      const { inputTokens, outputTokens, restTokens } = await getTokensForAppState(appState, enc)
      
      setTokenCounts({
        systemMessageTokens,
        userMessageTokens,
        assistantMessageTokens,
        toolMessageTokens,
        inputTokens,
        outputTokens,
        restTokens,
        actionDescriptionsTokens,
      })
    }

    let simplePlannerConfig;
    if (resolvedPlannerConfig.type === 'cot') {
      simplePlannerConfig = resolvedPlannerConfig.thinkingStage
    } else if (resolvedPlannerConfig.type === 'simple') {
      simplePlannerConfig = resolvedPlannerConfig
    } else {
      throw new Error(`Unknown planner config type: ${resolvedPlannerConfig}`);
    }

    const prompts = {
      system: simplePlannerConfig.systemPrompt,
      user: simplePlannerConfig.userPrompt,
    }
    const actionDescriptions = simplePlannerConfig.actionDescriptions
    // append the last user message to the message history
    let extendedMessageHistory = [...messageHistory, lastMessage]
    const messages = appState ? getLLMContextFromState(prompts, appState as AppState, extendedMessageHistory) : []
    const systemMessage = messages.length ? messages[0] : {}
    const nonSystemMessages = messages.length ? messages.slice(1, messages.length - 1) : []
    
    const jsonStyle = {fontSize: "12px", lineHeight: 1, marginTop: "10px"}
    const reloadAppState = async () => {
      const app = getApp()
      const appState = await app.getState()
      setAppState(appState)
      setResolvedPlannerConfig(await app.getPlannerConfig())
      countAllTokens(systemMessage, nonSystemMessages, appState, actionDescriptions)
    }
    // removing this useEffect because its hurting my brain fixing it
    // useEffect(reloadAppState, [])
    const reloadMetabaseReduxState = () => {
      const fieldsToFetch = ['qb', 'admin', 'dashboard']
      const promises = fieldsToFetch.map( (field) => ( getMetabaseState(field)).then((data) => ({[field]: data}) ))
      Promise.all(promises).then((fieldsData) => {
        const data = fieldsData.reduce((acc, fieldData) => {
          return {...acc, ...fieldData}
        }, {})
        setMetabaseReduxState(data)
      })
    }
    const getTokenTokenPercs = (key: string) => {
      const total = Object.values(tokenCounts).reduce((s, a) => s + a, 0)
      if (key === 'totalTokens') {
        return `${total} | 100%`
      }
      const value = tokenCounts[key]
      const perc = total ? Math.round(value * 100 / Object.values(tokenCounts).reduce((s, a) => s + a, 0)) : 0
      return `${value} | ${perc}%`
    }
    const activeThreadIdx = useSelector((state: RootState) => state.chat.activeThread)
    return (
      <Box>
        <Text fontSize="lg" fontWeight="bold">LLM Context</Text>
        <Text fontSize="xs" fontWeight="bold" color="minusxGreen.800">Total Tokens: {getTokenTokenPercs('totalTokens')}</Text>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5} width={"100%"}>
          {/* show selection to choose active thread */}
          <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text fontSize="md" fontWeight="bold">Active Thread</Text>
            <Select
              value={activeThreadIdx}
              onChange={(e) => {
                return dispatch(switchToThread(parseInt(e.target.value)))
              }}
            >
              {/* show options 0 to numThreads-1*/}
              {Array.from(Array(numThreads).keys()).map((threadIdx) => (
                <option key={threadIdx} value={threadIdx}>{threadIdx}</option>
              ))}
            </Select>
          </HStack>
        </Box>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text fontSize="md" fontWeight="bold">LLM Info</Text>
          </HStack>
          <ReactJson src={simplePlannerConfig.llmSettings} collapsed={0}  style={jsonStyle}/>
        </Box>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text fontSize="md" fontWeight="bold">System Prompt</Text>
          </HStack>
          <Text fontSize="xs" fontWeight="bold" color="minusxGreen.800">Tokens: {getTokenTokenPercs('systemMessageTokens')}</Text>
          <ReactJson src={systemMessage} collapsed={0}  style={jsonStyle}/>
        </Box>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text fontSize="md" fontWeight="bold">Action Descriptions</Text>
          </HStack>
          <Text fontSize="xs" fontWeight="bold" color="minusxGreen.800">Tokens: {getTokenTokenPercs('actionDescriptionsTokens')}</Text>
          <ReactJson src={actionDescriptions} collapsed={0}  style={jsonStyle}/>
        </Box>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text fontSize="md" fontWeight="bold">Message History</Text>
          </HStack>
          <Text fontSize="xs" fontWeight="bold" color="minusxGreen.800">Tokens: (user: {getTokenTokenPercs('userMessageTokens')}, assistant: {getTokenTokenPercs('assistantMessageTokens')}, tool: {getTokenTokenPercs('toolMessageTokens')})</Text>
          <ReactJson src={nonSystemMessages} collapsed={0}  style={jsonStyle}/>
        </Box>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text fontSize="md" fontWeight="bold">{tool.toUpperCase()} App State</Text>
            <HStack>
              <Button size={"xs"} onClick={reloadAppState} colorScheme="minusxGreen">Reload App State</Button>
            </HStack>
          </HStack>
          <Text fontSize="xs" fontWeight="bold" color="minusxGreen.800">Tokens: (input: {getTokenTokenPercs('inputTokens')}, output: {getTokenTokenPercs('outputTokens')}, rest: {getTokenTokenPercs('restTokens')})</Text>
          <ReactJson src={appState} collapsed={0}  style={jsonStyle}/>
        </Box>
        {
          tool == "metabase" && <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
            <HStack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
              <Text fontSize="md" fontWeight="bold">Metabase Redux State</Text>
              <HStack>
              <Button size={"xs"} onClick={reloadMetabaseReduxState} colorScheme="minusxGreen">Reload App State</Button>
            </HStack>
            </HStack>
            <ReactJson src={metabaseReduxState} collapsed={0}  style={jsonStyle}/>
          </Box>
        }
      </Box>
    );
  };
  