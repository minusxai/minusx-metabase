import React from 'react'
import {
  HStack,
  Text,
  Button,
  Flex,
  VStack
} from '@chakra-ui/react'
import { HiMiniSparkles } from "react-icons/hi2";
import chat from '../../chat/chat'

export const Suggestions = ({ title, suggestions, onSuggestionClick }: {title: string, suggestions: string[], onSuggestionClick?: (suggestion: string) => void }) => {

    const handleSuggestionClick = (suggestion: string) => {
        chat.addUserMessage({
                content: {
                type: "DEFAULT",
                text: suggestion,
                images: []
                },
        })
        onSuggestionClick?.(suggestion)
    };
  return (
    <Flex wrap="wrap" gap={2} aria-label='suggestions'>
      <HStack justifyContent={"space-between"} width={"100%"}>
        <HStack color="minusxGreen.500">
          <HiMiniSparkles/>
          <Text fontSize="sm" fontWeight={"bold"}>{title}</Text>
        </HStack>
        <HStack marginTop={0}>
        </HStack>
      </HStack>
      <VStack width={"100%"}>

      {suggestions.map((suggestion, index) => (
        <Button
          key={index}
          onClick={() => handleSuggestionClick(suggestion)}
          size="sm"
          colorScheme="minusXGreen"
          variant="outline"
          borderRadius="5px"
          textAlign={"left"}
          justifyContent={"flex-start"}
          width={"100%"}
          px={3}
          py={2}
          style={{
            whiteSpace: "normal",
            wordWrap: "break-word",
            height: "auto"
          }}
        >
          {suggestion}
        </Button>
      ))}
      </VStack>
    </Flex>
  );
};
