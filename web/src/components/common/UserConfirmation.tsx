import {
  Box,
  HStack,
  VStack,
  Icon,
  IconButton,
} from '@chakra-ui/react'
import React from 'react-redux'
import { BsX, BsCheck } from "react-icons/bs";
import _ from 'lodash'
import { dispatch } from '../../state/dispatch'
import { setUserConfirmationInput, UserConfirmationState } from '../../state/chat/reducer'

export const UserConfirmation = ({userConfirmation}: {userConfirmation: UserConfirmationState}) => {
  if (!userConfirmation.show) return null
  return (
    <VStack>
      <Box>{userConfirmation.content}</Box>
      {/*two buttons with yes and no*/}
      <HStack>
        <IconButton
          aria-label="Yes"
          icon={<Icon as={BsCheck} />}
          colorScheme='minusxGreen'
          variant={"ghost"}
          onClick={() => dispatch(setUserConfirmationInput('APPROVE'))}
        />
        <IconButton
          aria-label="No"
          icon={<Icon as={BsX} />}
          colorScheme='minusxBW'
          variant={"ghost"}
          onClick={() => dispatch(setUserConfirmationInput('REJECT'))}
        />
      </HStack>
    </VStack>
  )
}
