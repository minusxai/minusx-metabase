import { LLMSettings } from "../../helpers/LLM/types";
import { HStack, VStack, Radio, Select, Text } from "@chakra-ui/react";
import {
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react'
import { ToolName, editLLMSettings } from "../../state/toolConfig/reducer";
import { dispatch } from "../../state/dispatch";
import React from 'react'


export default function ({ llmSettings, index, tool }: { llmSettings: LLMSettings, index: number, tool: ToolName }) {
  const model = llmSettings.model
  const response_format_type = llmSettings.response_format.type
  const tool_choice = llmSettings.tool_choice
  const temperature = llmSettings.temperature
  return (
    <VStack w={"100%"} alignItems={"stretch"}>
      <HStack alignItems={"center"} justifyContent={"space-between"}>
        <Text>Model</Text>
        <Select
          value={model || ''}
          onChange={(e) => {
            return dispatch(editLLMSettings({ tool, index, settings: { ...llmSettings, model: e.target.value } }))
          }}
        >
          <option value="gpt-4.1">GPT-4.1</option>
          <option value="gpt-4o">GPT-4O</option>
          <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</option>
          <option value="gpt-3.5-turbo-1106">GPT-3.5 Turbo (16k)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-4-1106-preview">GPT-4 Turbo (1106)</option>
          <option value="groq/llama3-70b-8192">Llama3 Groq 70b (8192 tools)</option>
          <option value="fireworks_ai/firefunction-v1">Fireworks AI Firefunction v1</option>
          <option value="fireworks_ai/firefunction-v2">Fireworks AI Firefunction v2</option>
        </Select>
      </HStack>
      <HStack alignItems={"center"} justifyContent={"space-between"}>
        <Text>response_format</Text>
        <Select
          value={response_format_type || ''}
          onChange={(e) => {
            return dispatch(editLLMSettings({ tool, index, settings: { ...llmSettings, response_format: {type: e.target.value as "text" | "json_object"} } }))
          }}
        >
          <option value="text">text</option>
          <option value="json_object">json_object</option>
        </Select>
      </HStack>
      <HStack alignItems={"center"} justifyContent={"space-between"}>
        <Text>tool_choice</Text>
        <Select
          value={tool_choice || ''}
          onChange={(e) => {
            return dispatch(editLLMSettings({ tool, index, settings: { ...llmSettings, tool_choice: e.target.value } }))
          }}
        >
          <option value="auto">auto</option>
          <option value="required">required</option>
        </Select>
      </HStack>
      <HStack alignItems={"center"} justifyContent={"space-between"}>
        <Text>temperature</Text>
        <NumberInput
          onChange={(valueString) => {
            const value = parseFloat(valueString)
            return dispatch(editLLMSettings({ tool, index, settings: { ...llmSettings, temperature: value } }))
          }}
          value={temperature}
          max={2}
          min={0}
          step={0.05}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
       
      </HStack>
    </VStack>
  )
}