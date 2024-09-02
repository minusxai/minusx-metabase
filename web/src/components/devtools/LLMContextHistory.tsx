import React from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import ReactJson from 'react-json-view'
import { identifyToolNative } from '../../tools/common/identifyTool';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';

export const LLMContextHistory: React.FC<null> = () => {
  const tool = identifyToolNative()
    const activeThread = useSelector((state: RootState) => state.chat.activeThread)
    const messageHistory = activeThread.messages
    const debugChatIndex = activeThread.debugChatIndex

    return (
      <Box>
        <Text fontSize="sm"><b>Note:</b> Click on the debug button on any Action Stack in the chat to see the {tool.toUpperCase()} App State for that LLM call.</Text>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <Text fontSize="md" fontWeight="bold">Selected Action Stack</Text>
          {debugChatIndex>=0 ? 
          <ReactJson src={messageHistory[debugChatIndex]?.content} collapsed={2}  style={{fontSize: "12px", lineHeight: 1}}/>
          : <Text>Not Selected</Text>}
        </Box>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
        <VStack alignItems={"start"} marginTop={0} mb={4} gap={0}>
          <Text fontSize="md" fontWeight="bold">{tool.toUpperCase()} App State</Text>
          <Text fontSize="sm">This was the App State that was input to the LLM to get the above Action Stack</Text>
        </VStack>
        {debugChatIndex>=0 ? 
          <ReactJson src={messageHistory[debugChatIndex]?.debug} collapsed={4}  style={{fontSize: "12px", lineHeight: 1}}/>
          : <Text>Not Selected</Text>}
        </Box>
      </Box>
    );
  };
  