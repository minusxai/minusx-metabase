import React, { useEffect } from 'react';
import { Box, Button, Text, ChakraProvider, Image, HStack, IconButton } from '@chakra-ui/react'
import { BsTerminalFill, BsTools } from "react-icons/bs";
import { TbWorldShare } from "react-icons/tb";
import { get } from 'lodash'

const playgroundLink = 'https://minusx.ai/playground'
const requestToolLink = 'https://minusx.ai/tool-request'
const websiteLink = 'https://minusx.ai'

export const Popup: React.FC = () => {
  const defaultPopupText = `We currently support MinusX on any Jupyter (Lab, Notebook, Lite, etc), or Metabase (SQL Query page) instance. You can test-drive it in a playground we've created for you, or request support for your favourite analytics apps!`
  const [popupText, setPopupText] = React.useState<string>(defaultPopupText);
  useEffect(() => {
    chrome.storage.local.get().then((localConfigs) => {
      const popupText = get(localConfigs, "configs.popup_text")
      if (popupText) {
        setPopupText(popupText)
      } else {
        setPopupText(defaultPopupText)
      }
    })
  })
  return (
    <ChakraProvider>
      <Box width="400px" p={5}>
        <HStack justifyContent={"space-between"}>
          <Image width={"150px"} src={chrome.runtime.getURL('logo.svg')} />
          <IconButton aria-label="Website" icon={<TbWorldShare />} onClick={() => window.open(websiteLink, '_blank')} isRound={true}/>
        </HStack>
        <Text bg={'gray.50'} borderRadius={5} p={5} mt={2} fontSize="sm">{popupText}</Text>
        <HStack justifyContent={"space-between"}>
          <Button mt={2} onClick={() =>  window.open(playgroundLink, '_blank')} aria-label="Go to Playground" leftIcon={<BsTerminalFill/>} colorScheme='blue' variant='solid'>Go to Playground</Button>
          <Button mt={3} onClick={() =>  window.open(requestToolLink, '_blank')} aria-label="Request Tool" leftIcon={<BsTools/>} colorScheme='gray' variant='solid'>App Support</Button>
        </HStack>
      </Box>
    </ChakraProvider>
  );
};