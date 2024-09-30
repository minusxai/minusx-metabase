import {
  Icon,
  IconButton,
  Tooltip,
  Button
} from '@chakra-ui/react'

import { useIntercom } from 'react-use-intercom'
import { BiSupport } from "react-icons/bi"
import axios from 'axios';
import React, { useState } from 'react'
import { configs } from '../../constants'
import { dispatch } from '../../state/dispatch';
import { setIntercomBooted } from '../../state/settings/reducer';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';



export const SupportButton = ({email, showText} : {email: string, showText: boolean}) => {
  const {
    boot,
    show,
    hide,
    isOpen,

  } = useIntercom();
  
  const intercomBooted = useSelector((state: RootState) => state.settings.demoMode)
  const updateIntercomBooted = (value: boolean) => {
    dispatch(setIntercomBooted(value))
  }
  const toggleSupport = async () => {
    if (!intercomBooted) {
      const response = await axios.get(`${configs.SERVER_BASE_URL}/support/`);
      if (response.data.intercom_token) {
        console.log('Booting intercom with token', response.data.intercom_token)
        boot({
          hideDefaultLauncher: true,
          email: email,
          name: email.split('@')[0],
          userHash: response.data.intercom_token,
        })
        updateIntercomBooted(true)
      }
    }
    isOpen ? hide() : show()
  }
  return <Tooltip hasArrow label="Support" placement='left' borderRadius={5} openDelay={500}>
    {
      showText ? <Button size="xs" colorScheme="minusxGreen" onClick={toggleSupport}>Live Support</Button> :
      <IconButton
      isRound={true}
      variant="solid"
      colorScheme="minusxGreen"
      size={'sm'}  
      aria-label="Support"
      icon={<Icon as={BiSupport} boxSize={4} />}
      onClick={toggleSupport}
      />
    }
    
  </Tooltip>
}