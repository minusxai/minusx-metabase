import React, { useEffect, useState } from 'react'
import { getMetabaseState } from '../../app/rpc'
import {
  Box, VStack, Text, Stack, RadioGroup, Button,
  HStack, Radio, Textarea, Input
} from '@chakra-ui/react';
import ReactJson from 'react-json-view';
import { getDashboardAppState } from '../../../../apps/src/metabase/helpers/dashboard/appState';
import { getLLMResponse } from '../../app/api';
import { fetchData } from '../../app/rpc';
import { getSelectedDbId } from '../../../../apps/src/metabase/helpers/getUserInfo';
import { MetabaseStateTable, metabaseToMarkdownTable } from '../../../../apps/src/metabase/helpers/operations';
import { ToolCalls } from '../../state/chat/reducer';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';
import { DashboardInfo, DatasetResponse } from '../../../../apps/src/metabase/helpers/dashboard/types';
// import { substituteParameters } from '../../../../apps/src/metabase/helpers/dashboard/runSqlQueryFromDashboard';

const levenshteinDistance = (s: string, t: string) => {
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const arr = [];
  for (let i = 0; i <= t.length; i++) {
    arr[i] = [i];
    for (let j = 1; j <= s.length; j++) {
      arr[i][j] =
        i === 0
          ? j
          : Math.min(
              arr[i - 1][j] + 1,
              arr[i][j - 1] + 1,
              arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
            );
    }
  }
  return arr[t.length][s.length];
};




async function runSQLQuery(dbId: Number, sql: string) {
  // sql = substituteParameters(sql, parameters)
  // use metabase api /datasets to run the query and get results
  const response = await fetchData('/api/dataset', 'POST', {
      "database": dbId,
      "type": "native",
      "native": {
        "query": sql,
        "template-tags": {}
      },
      "parameters": []
    }) as DatasetResponse;
  return response
}

async function runSingleValidation(
  dashboardInfoWithoutOneCard: DashboardInfo, 
  card: DashboardInfo['cards'][0], 
  dbId: number) {
  const systemMessage = `
  You are an expert at data analysis. You are given a JSON of a dashboard that contains several cards, within a <DashboardInfo/> tag.
  You are also given a user request to create a new card, within a <CardRequest/> tag. Write the SQL query to create the new card.
  Use the provided tool 'runSQLQuery' to run the query. If there is an error, keep trying until you get a valid result.
  There may be parameters on the dashboards. If so, make sure to use parameters when writing the SQL query.
  `
  const userMessage = "Dashboard JSON: <DashboardInfo> " + JSON.stringify(dashboardInfoWithoutOneCard) + " <DashboardInfo/> \nUser Request: <CardRequest> " + JSON.stringify(card.name) + " <CardRequest/>"
  const actions = [
    {
      name: 'runSQLQuery',
      args: {
        sql: {
          type: 'string',
          description: "The SQL query to to run against the database.",
        },
      },
      description: `Runs the SQL query against the database and returns the result, or an error if the query fails.`,
      required: ["sql"],
    }
  ]
  let messages: Array<ChatCompletionMessageParam> = [{
    role: "system",
    content: systemMessage,
  }, {
    role: "user",
    content: userMessage,
  }]
  let maxTryCount = 1
  while (maxTryCount > 0) {
    maxTryCount -= 1
    const response = await getLLMResponse({
      messages,
      llmSettings: {
        model: "gpt-4.1",
        temperature: 0,
        response_format: {
          type: "text",
        },
        tool_choice: "required",
      },
      actions
    });
    const jsonResponse = await response.data
    if (jsonResponse.error) {
      throw new Error(jsonResponse.error)
    }
    const tool_calls = jsonResponse.tool_calls as ToolCalls
    if (tool_calls.length != 1) {
      throw new Error("<><><><><Expected only one tool call")
    }
    const tool_call = tool_calls[0]
    if (tool_call.function.name != "runSQLQuery") {
      throw new Error("<><><><><Expected runSQLQuery tool call")
    }
    const args = tool_call.function.arguments
    const sql = JSON.parse(args).sql
    const result = await runSQLQuery(dbId, sql)
    if (result.error) {
      // console.log('<><><><><><>Error is', result.error, {
      //   sql,
      //   substitutedSql: substituteParameters(sql, dashboardInfoWithoutOneCard.parameters)
      // })
      messages.push({
        role: "assistant",
        tool_calls: tool_calls
      })
      messages.push({
        role: "tool",
        tool_call_id: tool_call.id,
        content: result.error
      })
    } else {
      const asMarkdown = metabaseToMarkdownTable(result.data, 1000)
      const sqlLevenshtein = levenshteinDistance(sql, card.sql|| '')
      const outputTableMarkdownLevenshtein = levenshteinDistance(asMarkdown, card.outputTableMarkdown as string)
      return {
        originalCard: {
          sql: card.sql, outputTableMarkdown: card.outputTableMarkdown
        },
        llmResults: {
          sql, outputTableMarkdown: asMarkdown
        },
        diffs: {
          sqlLevenshtein, outputTableMarkdownLevenshtein
        },
        debug: {
          card,
          messages
        }
      }
    }
  }

}


async function getValidations(dashboardInfo: DashboardInfo | null) {
  if (!dashboardInfo) {
    console.log('<><><><>No dashboard info')
    return 
  }
  if (dashboardInfo.cards.length <= 1) {
    return
  }
  const dbId = dashboardInfo.cards[0].databaseId
  if (!dbId) {
    throw new Error('<><><><>No database selected')
  }
  let cards = dashboardInfo.cards.slice(0)
  // iterate over cards, remove one at a time and call runSingleValidation
  let allResultPromises = []
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    let restOfTheCards = cards.slice(0)
    restOfTheCards.splice(i, 1)
    dashboardInfo.cards = restOfTheCards
    allResultPromises.push(runSingleValidation(dashboardInfo, card, dbId))
  }
  const results = await Promise.all(allResultPromises)
  return results
}
export default function DashboardCrossValidation() {
  const [dashboardInfo, setDashboardInfo] = useState<any>([])
  const [results, setResults] = useState<any>([])
  const onClickGetDashboardInfo = () => {
    getDashboardAppState().then(dashboardInfo => {
      setDashboardInfo(dashboardInfo)
    })
  }
  const onClickGetValidations = () => {
    getDashboardAppState().then(getValidations)
      .then(results => {
        console.log("<><><><><>< results", results)
        setResults(results)
      })
  }

  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold">Dashboard Cross Validation</Text>
      <VStack alignItems={"stretch"}>
        <ReactJson src={dashboardInfo} collapsed={0}  style={{fontSize: "12px", lineHeight: 1, marginTop: "10px"}}/>
        <Button onClick={onClickGetDashboardInfo} colorScheme='minusxGreen'>Get Dashboard Info</Button>
        <Button onClick={onClickGetValidations} colorScheme='minusxGreen'>Get Results</Button>
        <ReactJson src={results} collapsed={0}  style={{fontSize: "12px", lineHeight: 1, marginTop: "10px"}}/>
      </VStack>
    </Box>
  )
}