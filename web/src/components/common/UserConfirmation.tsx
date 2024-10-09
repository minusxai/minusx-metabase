import {
  Box,
  HStack,
  VStack,
  Icon,
  IconButton,
  Text,
  Stack,
  Switch
} from '@chakra-ui/react'
import React from 'react-redux'
import { BsX, BsCheck } from "react-icons/bs";
import _ from 'lodash'
import { dispatch } from '../../state/dispatch'
import { setUserConfirmationInput, toggleUserConfirmation } from '../../state/chat/reducer'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { useEffect } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import vsd from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
// import { setConfirmChanges } from '../../state/settings/reducer';
import { getPlatformLanguage } from '../../helpers/utils';

SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('python', python);


export const UserConfirmation = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const userConfirmation = activeThread.userConfirmation
  const currentTool = useSelector((state: RootState) => state.settings.iframeInfo.tool)
  const confirmChanges = useSelector((state: RootState) => state.settings.confirmChanges)

  useEffect(() => {
    dispatch(setUserConfirmationInput('NULL'))
    dispatch(toggleUserConfirmation({'show': false, 'content': ''}))
  }, []);

  // const updateConfirmChanges = (value: boolean) => {
  //   dispatch(setConfirmChanges(value))
  // }

  
  if (!userConfirmation.show) return null
  return (
    <VStack alignItems={"center"}>
      <Text fontWeight={"bold"} fontSize={17}>Accept below code?</Text>
      <Box width={"100%"} p={2} bg={"#1e1e1e"} borderRadius={5}>
        <SyntaxHighlighter language={getPlatformLanguage(currentTool)} style={vsd}>
          {userConfirmation.content}
        </SyntaxHighlighter>
      </Box>
      {/*two buttons with yes and no*/}
      <HStack width={"80%"}>
        <IconButton
          flex={1}
          aria-label="No"
          icon={<Icon as={BsX} boxSize={7}/>}
          colorScheme='red'
          // color={"red"}
          variant={"solid"}
          onClick={() => dispatch(setUserConfirmationInput('REJECT'))}
        />
        <IconButton
          flex={1}
          aria-label="Yes"
          icon={<Icon as={BsCheck} boxSize={7}/>}
          colorScheme='minusxGreen'
          variant={"solid"}
          onClick={() => dispatch(setUserConfirmationInput('APPROVE'))}
        />
      </HStack>
      {/* <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
        <Text color={"minusxBW.800"} fontSize={"xs"}>Toggle User Confirmation</Text>
        <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size={"sm"} isChecked={confirmChanges} onChange={(e) => updateConfirmChanges(e.target.checked)} />
      </Stack> */}
    </VStack>
  )
}
