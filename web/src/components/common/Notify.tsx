import { Text, VStack, HStack, Box } from '@chakra-ui/react';
import { BiSolidInfoCircle } from 'react-icons/bi';
import React from 'react';

interface NotifyProps {
  children?: React.ReactNode;
  title?: string;
}

export const Notify = ({ 
  children, 
  title = "Heads Up!"
}: NotifyProps) => {
  const bgColor = 'white'
  const borderColor = 'minusxGreen.800'
  const iconColor = 'minusxGreen.800'

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
          <BiSolidInfoCircle size={16} color={"teal"} />
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