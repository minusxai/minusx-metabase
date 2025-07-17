import React from 'react';
import { Box, HStack, VStack, Text } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { switchToThread } from '../../state/chat/reducer';

export const History: React.FC<null> = () => {
    const threads = useSelector((state: RootState) => state.chat.threads)
    const activeThreadIdx = useSelector((state: RootState) => state.chat.activeThread)
    
    const getThreadPreview = (threadIdx: number) => {
      const charLimit = 40; 
      const thread = threads[threadIdx]
      if (thread.messages.length === 0) {
        return "New conversation"
      }
      
      const firstUserMessage = thread.messages.find(msg => msg.role === 'user')
      if (firstUserMessage && firstUserMessage.content.type === 'DEFAULT') {
        return firstUserMessage.content.text.slice(0, charLimit) + (firstUserMessage.content.text.length > charLimit ? '...' : '')
      }
      
      return `Thread ${threadIdx + 1}`
    }
    
    const getThreadTimestamp = (threadIdx: number) => {
      const thread = threads[threadIdx]
      const lastMessage = thread.messages[thread.messages.length - 1]
      return new Date(lastMessage.updatedAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit'
      })
    }
    
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold">History</Text>
        <Text fontSize="md" color="minusxBW.600">Your recent conversations</Text>
        
        <VStack mt={4} spacing={2} align="stretch">
          {threads
            .map((thread, threadIdx) => ({ thread, threadIdx }))
            .filter(({ thread }) => thread.messages.length > 0)
            .sort((a, b) => {
              const aLastUpdate = a.thread.messages[a.thread.messages.length - 1].updatedAt;
              const bLastUpdate = b.thread.messages[b.thread.messages.length - 1].updatedAt;
              return bLastUpdate - aLastUpdate;
            })
            .map(({ thread, threadIdx }) => (
            <Box
              key={threadIdx}
              p={3}
              backgroundColor={threadIdx === activeThreadIdx ? "minusxBW.50" : "minusxBW.300"}
              borderRadius={8}
              border={threadIdx === activeThreadIdx ? "2px solid" : "2px solid"}
              borderColor={threadIdx === activeThreadIdx ? "minusxGreen.300" : "minusxBW.200"}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                backgroundColor: threadIdx === activeThreadIdx ? "minusxBW.50" : "minusxBW.50",
                boxShadow: "xs"
              }}
              onClick={() => dispatch(switchToThread(threadIdx))}
            >
              <HStack justify="space-between" align="start">
                <VStack align="start" spacing={1} flex={1}>
                  <Text 
                    fontSize="sm" 
                    fontWeight={threadIdx === activeThreadIdx ? "bold" : "medium"}
                    color={threadIdx === activeThreadIdx ? "minusxGreen.700" : "minusxBW.700"}
                    noOfLines={2}
                  >
                    {getThreadPreview(threadIdx)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {thread.messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').length} messages
                  </Text>
                </VStack>
                <Text fontSize="xs" color="gray.500" flexShrink={0}>
                  {getThreadTimestamp(threadIdx)}
                </Text>
              </HStack>
            </Box>
          ))}
        </VStack>
        
        {threads.filter(thread => thread.messages.length > 0).length === 0 && (
          <Box 
            mt={4} 
            p={4} 
            backgroundColor="gray.50" 
            borderRadius={8} 
            textAlign="center"
          >
            <Text color="gray.500">No conversations yet</Text>
          </Box>
        )}
      </Box>
    );
  };
  