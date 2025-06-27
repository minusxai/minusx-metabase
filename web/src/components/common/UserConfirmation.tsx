import {
  Box,
  HStack,
  VStack,
  Icon,
  IconButton,
  Text,
} from '@chakra-ui/react'
import React from 'react-redux'
import { BsX, BsCheck } from "react-icons/bs";
import _ from 'lodash'
import { dispatch } from '../../state/dispatch'
import { setUserConfirmationInput, toggleUserConfirmation } from '../../state/chat/reducer'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { useEffect } from 'react'
import { CodeBlock } from './CodeBlock'


export const UserConfirmation = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const userConfirmation = activeThread.userConfirmation
  const currentTool = useSelector((state: RootState) => state.settings.iframeInfo.tool)

  useEffect(() => {
    dispatch(setUserConfirmationInput('NULL'))
    dispatch(toggleUserConfirmation({show: false, content: '', contentTitle: '', oldContent: ''}))
  }, []);

  
  if (!userConfirmation.show) return null
  return (
    <VStack 
      borderRadius={10} 
      bg="minusxBW.300" 
      alignItems="stretch" 
      padding={4}
      spacing={3}
    >
      <Text 
        fontSize="md" 
        fontWeight="medium" 
        color="minusxBW.900"
        textAlign="center"
      >
        {userConfirmation.contentTitle ?? "Review and confirm changes"}
      </Text>
      
      <Box 
        width="100%" 
        bg="gray.900" 
        borderRadius="md" 
        overflow="hidden"
      >
        <CodeBlock code={userConfirmation.content} tool={currentTool} oldCode={userConfirmation.oldContent} language='text'/>
      </Box>
      
      <HStack spacing={2} width="100%" justify="center">
        <IconButton
          aria-label="Reject changes"
          icon={<Icon as={BsX} boxSize={4}/>}
          bg="red.500"
          color="red.100"
          size="sm"
          borderRadius="md"
          w={"50%"}
          _hover={{ bg: "red.400" }}
          onClick={() => dispatch(setUserConfirmationInput('REJECT'))}
        />
        <IconButton
          aria-label="Approve changes"
          icon={<Icon as={BsCheck} boxSize={4}/>}
          bg="green.500"
          color="green.100"
          w={"50%"}
          size="sm"
          borderRadius="md"
          _hover={{ bg: "green.400" }}
          onClick={() => dispatch(setUserConfirmationInput('APPROVE'))}
        />
      </HStack>
    </VStack>
  )
}
