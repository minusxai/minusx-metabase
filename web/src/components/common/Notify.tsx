import { Text, VStack, HStack, Box, Icon, IconButton } from '@chakra-ui/react';
import { BiSolidInfoCircle } from 'react-icons/bi';
import { IoClose } from 'react-icons/io5';
import React, { useState } from 'react';

interface NotifyProps {
  children?: React.ReactNode;
  title?: string;
  notificationType?: 'info' | 'warning' | 'error';
}

export const Notify = ({ 
  children, 
  title = "Heads Up!",
  notificationType = "info",
}: NotifyProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const bgColor = 'white'
  const borderColor = notificationType === 'info' ? 'minusxGreen.800' : notificationType === 'warning' ? 'orange.500' : 'red.600'
  const iconColor = notificationType === 'info' ? 'minusxGreen.800' : notificationType === 'warning' ? 'orange.500' : 'red.600';

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      bg={bgColor}
      borderLeft="4px solid"
      borderColor={borderColor}
      borderRadius="md"
      shadow="sm"
      p={3}
      w="full"
    >
      <VStack align="flex-start" spacing={2} w="full">
        <HStack spacing={2} align="center" justify="space-between" w="full">
          <HStack spacing={2} align="center">
            {
              notificationType === 'warning' ? 
                <Icon as={BiSolidInfoCircle} size={16} color={"orange.500"} /> :
              notificationType === 'error' ? 
                <Icon as={BiSolidInfoCircle} size={16} color={"red.600"} /> : 
              <Icon as={BiSolidInfoCircle} size={16} color={"minusxGreen.800"} />
            }
            <Text 
              fontSize="sm" 
              fontWeight="semibold" 
              m={0}
              color={iconColor}
            >
              {title}
            </Text>
          </HStack>
          {notificationType != 'error' && (
            <IconButton
              aria-label="Dismiss notification"
              icon={<IoClose />}
              size="sm"
              variant="ghost"
              color="gray.500"
              onClick={handleDismiss}
              _hover={{ bg: notificationType === 'info' ? 'minusxGreen.800' : notificationType === 'warning' ? 'orange.500' : 'red.600', color: 'white' }}
            />
          )}
        </HStack>
        {children && (
          <Text 
            fontSize="sm" 
            lineHeight="relaxed"
            color={"gray.600"}
            w="full"
          >
            {children}
          </Text>
        )}
      </VStack>
    </Box>
  );
};