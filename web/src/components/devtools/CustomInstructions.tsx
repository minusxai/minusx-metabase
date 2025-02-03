import { Text } from '@chakra-ui/react';
import React, { useEffect } from "react"
import AdditionalContext from "../common/AdditionalContext"
import { getParsedIframeInfo } from "../../helpers/origin"
import { SemanticLayer } from '../common/SemanticLayer';
import { getApp } from '../../helpers/app';

const useAppStore = getApp().useStore()


export const CustomInstructions: React.FC<null> = () => {
  const tool = getParsedIframeInfo().tool
  if (tool == 'metabase') {
    return <>
      <Text fontSize="lg" fontWeight="bold">Custom Instructions</Text>
      <Text color={"minusxBW.600"} fontSize="sm">Adding custom instructions (including important queries & descriptions) allows MinusX to generate correct answers to your questions.</Text>
      <AdditionalContext />
    </>
  //   return <>
  //     <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Semantic Layer</Text>
  //     <Text color={"minusxBW.600"} fontSize="xs">Providing MinusX with important queries and descriptions that can be composed allows MinusX to generate more relevant queries to your answers.</Text>
  //     <SemanticLayer />
  //   </>
  }
  return <>
    <Text>Coming soon!</Text>
  </>
}