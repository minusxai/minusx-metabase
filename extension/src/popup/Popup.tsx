import React, { useEffect } from 'react';
import { Box, Button, Text, ChakraProvider, Image, HStack, IconButton, Link } from '@chakra-ui/react'
import { BsTerminalFill, BsTools } from "react-icons/bs";
import { TbWorldShare } from "react-icons/tb";
import { get } from 'lodash'

const playgroundLink = 'https://minusx.ai/playground'
const requestToolLink = 'https://minusx.ai/tool-request'
const websiteLink = 'https://minusx.ai'

const getSource = () => {
  return chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    var activeTab = tabs[0];
    var activeTabId = activeTab.id;
    if (!activeTabId) return "ERROR: no active tab found"
    console.log("tab id" , activeTabId)
    return chrome.tabs.sendMessage(activeTabId, {fn: 'getPageSource', args: ['html']})
      .then(results => {
        console.log(results)
        return results.response
      }).catch(err => {
        console.log(err)
      })
})
}
export const Popup: React.FC = () => {
  return (
    <ChakraProvider>
      <Box width="400px" p={5}>
        <HStack justifyContent={"space-between"}>
          <Image width={"150px"} src={chrome.runtime.getURL('logo.svg')} />
          <IconButton aria-label="Website" icon={<TbWorldShare />} onClick={() => window.open(websiteLink, '_blank')} isRound={true}/>
        </HStack>
        <Text bg={'gray.50'} borderRadius={5} p={5} mt={2} fontSize="sm">
        Supported tools: Jupyter (Lab, Notebook, Lite, etc), Metabase (SQL Query page), Posthog (HogQL page). 
        <br/>
        Don't see MinusX on your app? Send a <Link href="https://minusx.ai/privacy-simplified"
            color="blue" onClick={() => getSource().then(src => alert(src))}>bug report</Link>.
        </Text>
        <HStack justifyContent={"space-between"}>
          <Button mt={2} onClick={() =>  window.open(playgroundLink, '_blank')} aria-label="Go to Playground" leftIcon={<BsTerminalFill/>} colorScheme='blue' variant='solid'>Go to Playground</Button>
          <Button mt={3} onClick={() =>  window.open(requestToolLink, '_blank')} aria-label="Request Tool" leftIcon={<BsTools/>} colorScheme='gray' variant='solid'>App Support</Button>
        </HStack>
      </Box>
    </ChakraProvider>
  );
};