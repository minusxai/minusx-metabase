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
import { setUserConfirmationInput, UserConfirmationState } from '../../state/chat/reducer'

export const UserConfirmation = ({userConfirmation}: {userConfirmation: UserConfirmationState}) => {
  if (!userConfirmation.show) return null
  return (
    <VStack alignItems={"center"}>
      <Text fontWeight={"bold"}>Accept below code?</Text>
      <Box>{userConfirmation.content}</Box>
      {/*two buttons with yes and no*/}
      <HStack width={"80%"}>
        <IconButton
          flex={1}
          aria-label="No"
          icon={<Icon as={BsX} />}
          colorScheme='red'
          // color={"red"}
          variant={"solid"}
          onClick={() => dispatch(setUserConfirmationInput('REJECT'))}
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
