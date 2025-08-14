import {
  Tooltip,
  Button,
  Box,
  keyframes
} from '@chakra-ui/react'

import { useIntercom } from 'react-use-intercom'
import { BiSupport } from "react-icons/bi"
import axios from 'axios';
import React, { useState, useEffect } from 'react'
import { configs } from '../../constants'

export const SupportButton = ({email} : {email: string}) => {
  const {
    boot,
    show,
    hide,
    isOpen,

  } = useIntercom();
  const [intercomBooted, setIntercomBooted] = useState(false)
  const [hasNotification, setHasNotification] = useState(false)
  const toggleSupport = async () => isOpen ? hide() : show()

  useEffect(() => {
    const bootIntercom = async () => {
      if (!intercomBooted) {
        try {
          const response = await axios.get(`${configs.SERVER_BASE_URL}/support/`);
          if (response.data.intercom_token) {
            console.log('Booting intercom with token', response.data.intercom_token);
            boot({
              hideDefaultLauncher: true,
              email: email,
              name: email.split('@')[0],
              userHash: response.data.intercom_token,
            });
            setIntercomBooted(true);
            // Set up event listener for new messages
            window.Intercom('onUnreadCountChange', function(unreadCount: number) {
              setHasNotification(unreadCount > 0);
            });
          }
        } catch (error) {
          console.error('Failed to boot Intercom:', error);
        }
      }
    };

    bootIntercom();
  }, []);

  const pulseAnimation = keyframes`
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
  `;
  return <Tooltip hasArrow label="Support" placement='left' borderRadius={5} openDelay={500}>
      <Box position="relative" display="inline-block">
      <Button leftIcon={<BiSupport size={14}/>} size="xs" colorScheme="minusxGreen" onClick={toggleSupport} py={0}>Support</Button>
      {hasNotification && (
        <Box
          position="absolute"
          top="-1"
          right="-1"
          width="2"
          height="2"
          bg="red.500"
          borderRadius="full"
          animation={`${pulseAnimation} 1.5s infinite`}
        />
      )}
    </Box>
    
  </Tooltip>
}
