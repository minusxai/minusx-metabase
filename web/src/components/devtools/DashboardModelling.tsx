import React, { useEffect, useState } from 'react'
import { getMetabaseState } from '../../app/rpc'
import {
  Box, VStack, Text, Stack, RadioGroup, Button,
  HStack, Radio, Textarea, Input
} from '@chakra-ui/react';
import ReactJson from 'react-json-view';
import { getDashboardInfoForModelling } from '../../../../apps/src/metabase/helpers/dashboard/appState';
import { getLLMResponse } from '../../app/api';


async function getModel(dashboardInfo: any) {
  const systemMessage = `
  You are an expert at data modelling. You are given a JSON of a dashboard. 
  Explain what it is about, and then refactor into one or two SQL models. Output the SQL models in a JSON.
  Then, recreate every input card using the SQL models and output that as a JSON.
  Instructions:
  - When explaining the dashboard, consider:
    - Which fact tables are used to measure the data?
    - What measurements are being made?
    - What are the important dimensions used in each of the input cards?
    - What is the granularity of the data?
    - What is the primary time dimension?
  - Any measures used should not be baked into the SQL. Output the measures separately as a JSON array.
  - Output JSON should be in the format of {"sql": <sql>, "measures": {name: <measure name>, sql: <measure sql expression>}[]}[]
  - Explicitly mention the granularity of each SQL model. Maintain the lowest granularity possible.
    - For time dimensions, keep the most granular time dimension possible in the model.
  - Any new dimensions created in any of the input cards should be present in the SQL models.
  - Make sure each of the input cards can be reconstructed using the SQL models. 
  `
  const userMessage = JSON.stringify(dashboardInfo)
  const response = await getLLMResponse({
    messages: [{
      role: "system",
      content: systemMessage,
    }, {
      role: "user",
      content: userMessage,
    }],
    llmSettings: {
      model: "gpt-4.1",
      temperature: 0,
      response_format: {
        type: "text",
      },
      tool_choice: "none",
    },
    actions: []
  });
  const jsonResponse = await response.data;
  const parsed: any = jsonResponse.content;
  return parsed;
}
export default function DashboardModelling() {
  const [dashboardInfo, setDashboardInfo] = useState<any>([])
  const [model, setModel] = useState<any>([])
  const onClickGetDashboardInfo = () => {
    getDashboardInfoForModelling().then(dashboardInfo => {
      setDashboardInfo(dashboardInfo)
    })
  }
  const onClickGetModel = () => {
    getDashboardInfoForModelling().then(getModel)
      .then(model => {
        console.log("<><><><><>< model", model)
        setModel(model)
      })
  }

  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold">Dashboard Modelling</Text>
      <VStack alignItems={"stretch"}>
        <ReactJson src={dashboardInfo} collapsed={0}  style={{fontSize: "12px", lineHeight: 1, marginTop: "10px"}}/>
        <Button onClick={onClickGetDashboardInfo} colorScheme='minusxGreen'>Get Dashboard Info</Button>
        <Button onClick={onClickGetModel} colorScheme='minusxGreen'>Get Model</Button>
        <Text>{model}</Text>
      </VStack>
    </Box>
  )
}