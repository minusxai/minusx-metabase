import React from 'react'
import { HStack, VStack,Text } from "@chakra-ui/react";
import ReactJson from "react-json-view";
import { ToolPlannerConfig } from 'apps/types';
export default function PlannerConfig({plannerConfig}: {plannerConfig: ToolPlannerConfig}) {
  let modelString;
  if (plannerConfig.type === "cot") {
    modelString = plannerConfig.thinkingStage.llmSettings.model + ", " + plannerConfig.toolChoiceStage.llmSettings.model;
  } else {
    modelString = plannerConfig.llmSettings.model;
  }
  return (
    
    <VStack w={"100%"} alignItems={"stretch"}>
      <HStack alignItems={"center"} justifyContent={"space-between"}>
        <Text>{plannerConfig.type}</Text>
        <Text>{modelString}</Text>
      </HStack>
      <ReactJson src={plannerConfig} collapsed={0} />
    </VStack>
  )
}