import { Text } from '@chakra-ui/react';
import React from "react"
import AdditionalContext from "../common/AdditionalContext"
import { getParsedIframeInfo } from "../../helpers/origin"
import { SemanticLayer } from '../common/SemanticLayer';

export const CustomInstructions: React.FC<null> = () => {
  const tool = getParsedIframeInfo().tool
  if (tool == 'metabase') {
    return <>
      <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Important Queries</Text>
      <Text color={"minusxBW.600"} fontSize="xs">Adding important queries (& descriptions) that can be composed allows MinusX to generate correct answers to your questions.</Text>
      <AdditionalContext />
    </>
  //   return <>
  //     <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Semantic Layer</Text>
  //     <Text color={"minusxBW.600"} fontSize="xs">Providing MinusX with important queries and descriptions that can be composed allows MinusX to generate more relevant queries to your answers.</Text>
  //     <SemanticLayer />
  //   </>
  }
  return <>
    <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Custom Instructions</Text>
    <Text color={"minusxBW.600"} fontSize="xs">Custom instructions allow you to share anything you'd like MinusX to consider while thinking.
    The instructions are specific to the app you're using (Metabase, Sheets, etc.).</Text>
    <AdditionalContext />
  </>
}