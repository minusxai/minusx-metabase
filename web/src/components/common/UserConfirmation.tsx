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
import { abortPlan } from '../../state/chat/reducer'

export const UserConfirmation = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const userConfirmation = activeThread.userConfirmation

  useEffect(() => {
    dispatch(setUserConfirmationInput('NULL'))
    dispatch(toggleUserConfirmation({'show': false, 'content': ''}))
  }, []);

  
  if (!userConfirmation.show) return null
  return (
    <VStack alignItems={"center"}>
      <Text fontWeight={"bold"}>Accept below code?</Text>
      <Box width={"100%"} p={2} bg={"minusxBW.300"} borderRadius={5}>
        <Text>{userConfirmation.content}</Text>
      </Box>
      {/*two buttons with yes and no*/}
      <HStack width={"80%"}>
        <IconButton
          flex={1}
          aria-label="No"
          icon={<Icon as={BsX} />}
          colorScheme='red'
          // color={"red"}
          variant={"solid"}
          onClick={() => {
            dispatch(setUserConfirmationInput('REJECT'))
            dispatch(abortPlan())
          }}
        />
        <IconButton
          flex={1}
          aria-label="Yes"
          icon={<Icon as={BsCheck} />}
          colorScheme='minusxGreen'
          variant={"solid"}
          onClick={() => dispatch(setUserConfirmationInput('APPROVE'))}
        />
      </HStack>
    </VStack>
  )
}
