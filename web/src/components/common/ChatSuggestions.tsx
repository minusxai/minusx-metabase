import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
  HStack,
  Textarea,
  VStack,
  Stack,
  Icon,
  IconButton,
  Divider,
  Tooltip,
  Text,
  Switch,
  Spinner,
  Button,
  Flex
} from '@chakra-ui/react'
import { HiMiniSparkles } from "react-icons/hi2";

interface ChatSuggestionsProps {
  suggestQueries: boolean;
  toggleSuggestions: (value: boolean) => void;
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatSuggestions: React.FC<ChatSuggestionsProps> = ({ suggestQueries, toggleSuggestions, suggestions, onSuggestionClick }) => {
  return (
    <Flex aria-label="chat-suggestions" wrap="wrap" gap={2}>
      <HStack justifyContent={"space-between"} width={"100%"}>
        <HStack color="minusxGreen.500">
          <HiMiniSparkles/>
          <Text fontSize="sm" fontWeight={"bold"}>Suggestions</Text>
        </HStack>
        <HStack marginTop={0}>
          <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size={"sm"} isChecked={suggestQueries} onChange={(e) => toggleSuggestions(e.target.checked)} />
        </HStack>
      </HStack>

      {suggestQueries && suggestions.length === 0 && (
        <HStack justifyContent={"center"} width={"100%"}><Spinner size="xs" color="minusxGreen.500" /></HStack>
      )}

      {suggestQueries && suggestions.map((suggestion, index) => (
        <Button
          key={index}
          aria-label="suggestion-button"
          onClick={() => onSuggestionClick(suggestion)}
          size="sm"
          colorScheme="blue"
          variant="outline"
          borderRadius="5px"
          textAlign={"left"}
          p={2}
          style={{
            whiteSpace: "normal",
            wordWrap: "break-word",
            height: "auto"
          }}
        >
          {suggestion}
        </Button>
      ))}
    </Flex>
  );
};
