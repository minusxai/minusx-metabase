import { Text, VStack, HStack, Box, Icon } from '@chakra-ui/react';
import { BiSolidInfoCircle } from 'react-icons/bi';
import React from 'react';

interface NotifyProps {
  children?: React.ReactNode;
  title?: string;
  notificationType?: 'info' | 'warning' | 'error';
}

export const Notify = ({ 
  children, 
  title = "Heads Up!",
  notificationType = "info" 
}: NotifyProps) => {
  const bgColor = 'white'
  const borderColor = notificationType === 'info' ? 'minusxGreen.800' : notificationType === 'warning' ? 'orange.500' : 'red.600'
  const iconColor = notificationType === 'info' ? 'minusxGreen.800' : notificationType === 'warning' ? 'orange.500' : 'red.600';

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