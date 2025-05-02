import React, { useEffect, useState } from 'react'
import { getMetabaseState } from '../../app/rpc'
import {
  Box, VStack, Text, Stack, RadioGroup, Button,
  HStack, Radio, Textarea, Input
} from '@chakra-ui/react';
import ReactJson from 'react-json-view';
import { getLLMResponse } from '../../app/api';
import TEST_STR from './test_model_response.txt?raw'
import { getDashboardAppState } from '../../../../apps/src/metabase/helpers/dashboard/appState';



export async function getModelFromDashboard(dashboardInfo: any) {
  const systemMessage = `
  You are an expert at data modelling. You are given a JSON of a dashboard. 
  Explain what it is about, and then refactor into one or two SQL models. Output the SQL models as a YAML file.
  Make sure the YAML file is within a code block.
  An example of the YAML file is attached at the bottom of this message.
  Instructions:
  - When explaining the dashboard, consider:
    - Which fact tables are used to measure the data?
    - What measurements are being made?
    - What are the important dimensions used in each of the input cards?
    - What is the granularity of the data?
    - What is the primary time dimension?
  - Any measures used should not be baked into the SQL. Output the measures in the YAML file within the 'measures' key
  - Explicitly mention the granularity of each SQL model. Maintain the lowest granularity possible.
    - For time dimensions, keep the most granular time dimension possible in the model.
  - Any new dimensions created in any of the input cards should be present in the SQL models.
  - Make sure each of the input cards can be reconstructed using the SQL models. 
  Example YAML file:
  \`\`\`yaml
  entities:
  - name: EmployeeDepartmentHistoryModified
    from_: EmployeeDepartmentHistory
    dimensions:
      - name: BusinessEntityID
        type: numeric
        description: Unique ID for the employee
      - name: ShiftID
        type: numeric
        description: Type of Shift
      - name: StartDate
        type: date
        description: Start date of the Employee
      - name: IsCurrentDepartment
        type: numeric
        description: Is this the current department?
        sql: case when EndDate IS NULL then 1 else 0 end
      - name: DepartmentID
        type: numeric
        description: Unique ID for the department
  - name: EmployeeModified
    from_: Employee
    dimensions:
      - name: BusinessEntityID
        type: numeric
        description: Unique ID for the employee
      - name: JobTitle
        type: string
        description: Job title of the employee
      - name: Gender
        type: string
        description: Gender of the employee
      - name: CurrentFlag
        type: numeric
        description: Is the person a current employee?
    metrics:
      - name: TotalEmployeeCount
        description: Count of all employees
        sql: COUNT( DISTINCT BusinessEntityID )
      - name: CurrentEmployeeCount
        description: Count of current employees
        sql: SUM(CurrentFlag)
      - name: GenderRatio
        description: Ratio of Males to Females
        sql: >-
          SUM(CASE WHEN Gender = 'M' THEN 1 ELSE 0 END) / NULLIF(SUM(CASE WHEN
          Gender = 'F' THEN 1 ELSE 0 END), 0)
  - name: DepartmentModified
    from_: Department
    dimensions:
      - name: DepartmentID
        type: numeric
        description: Unique ID for the department
      - name: Name
        type: string
        description: Name of the department
      - name: GroupName
        type: string
        description: Group name of the department
  - name: ShiftModified
    from_: Shift
    dimensions:
      - name: ShiftID
        type: numeric
        description: Unique ID for the shift
      - name: Name
        type: string
        description: Name of the shift
  \`\`\`
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
  const parsed: string = jsonResponse.content || '';
  // const parsed = TEST_STR;
  // get the stuff between the ```yaml and ``` using regex
  // get first matching group
  const yaml = parsed.match(/```yaml([.\s\S]*?)```/)?.[1];
  return yaml;
}
export default function DashboardModelling() {
  const [dashboardInfo, setDashboardInfo] = useState<any>([])
  const [model, setModel] = useState<any>([])
  const onClickGetDashboardInfo = () => {
    getDashboardAppState().then(dashboardInfo => {
      setDashboardInfo(dashboardInfo)
    })
  }
  const onClickGetModel = () => {
    getDashboardAppState().then(getModelFromDashboard)
      .then(model => {
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