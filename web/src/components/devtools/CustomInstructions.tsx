import { Text, Link } from '@chakra-ui/react';
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
      <Text fontSize="sm" color={"minusxGreen.600"} mt={1}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/10489277-custom-mode" isExternal>Read more about custom instructions best practices.</Link></Text>

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