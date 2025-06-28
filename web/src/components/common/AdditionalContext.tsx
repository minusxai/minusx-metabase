import { Button, VStack, Text, HStack, Box, Textarea } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import { dispatch } from '../../state/dispatch';
import { setAiRules } from '../../state/settings/reducer';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { toast } from '../../app/toast';
import { getParsedIframeInfo } from '../../helpers/origin';
import { Markdown } from './Markdown';
import { BsPencil, BsCheck, BsX } from 'react-icons/bs';

export const AdditionalContext = () => {
  const aiRules = useSelector((state: RootState) => state.settings.aiRules)
  const [customInstructions, setCustomInstructions] = useState(aiRules)
  const [isEditMode, setIsEditMode] = useState(false)
  const handleSave = () => {
    dispatch(setAiRules(customInstructions))
    setIsEditMode(false)
    toast({
      title: 'Custom Instructions Saved!',
      description: "These instructions will be used from the next query onwards.",
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'bottom-right',
    })
  }
  const handleCancel = () => {
    setCustomInstructions(aiRules)
    setIsEditMode(false)
  }

    useEffect(() => {
        setCustomInstructions(aiRules);
    }, [aiRules]);

  const tool = getParsedIframeInfo().tool
  let placeholder = `Example:\n1. Only use tables from "public" schema\n2. Always use plotly for plotting`
  if (tool == 'metabase') {
    placeholder = `Examples:\n## Project Name. \n\nProject Description \n\n\`\`\`sql\nSELECT * from MY_TABLE\nJOIN OTHER_TABLE\nWHERE CONDITION = VALUE\n\`\`\`\n\n## Project 2\n\nProject 2 Description\n...`
  }

  return (
    <VStack className='settings-body'
    justifyContent="start"
    alignItems="stretch"
    flex={1}
    height={'100%'}
    width={"100%"}
    overflow={"scroll"}
    pt={2}
    >
      <VStack alignItems={"start"} gap={1}> 
        <HStack justify={"space-between"} width={"100%"} alignItems={"center"}>
          <Text fontSize="sm" fontWeight="medium">Special instructions and saved memories</Text>
          {!isEditMode && (
            <Button 
              size="xs" 
              variant="solid" 
              colorScheme={"minusxGreen"} 
              onClick={() => setIsEditMode(true)} 
              leftIcon={<BsPencil />}
            >
              Edit
            </Button>
          )}
        </HStack>
        
        {isEditMode ? (
          <>
            <Box position="relative" width="100%">
              <Textarea
                marginTop={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder={placeholder}
                size="sm"
                _focus={{
                  border: '1.5px solid #16a085',
                  boxShadow: 'none',
                  bg: "#fefefe"
                }}
                border='1px solid #aaa'
                borderRadius='lg'
                minHeight={500}
                bg={"#eee"}
              />
              <Box
                position="absolute"
                bottom={3}
                right={3}
                bg="rgba(255, 255, 255, 0.9)"
                px={2}
                py={1}
                borderRadius="md"
                fontSize="xs"
                color="gray.600"
                border="1px solid"
                borderColor="gray.300"
                fontWeight="medium"
                zIndex={10}
                pointerEvents="none"
              >
                {customInstructions.trim().split(/\s+/).filter(word => word.length > 0).length} words
                {aiRules === customInstructions && (
                  <Text as="span" color="green.600" ml={2}>• Saved</Text>
                )}
              </Box>
            </Box>
            {customInstructions.trim().split(/\s+/).filter(word => word.length > 0).length > 500 && (
              <Text color={"red.500"} fontSize="xs" fontWeight={"bold"} pt={2} textAlign="center">
                ⚠️ Long minusx.md may degrade performance. Consider making it shorter.
              </Text>
            )}
            <HStack justify={"space-between"} width={"100%"} alignItems={"center"} pt={2}>
              <HStack spacing={2}>
                <Button size="sm" colorScheme="minusxGreen" onClick={handleSave} isDisabled={aiRules === customInstructions} leftIcon={<BsCheck />}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} leftIcon={<BsX />}>
                  Cancel
                </Button>
              </HStack>
              {aiRules != customInstructions && (
                <Text color={"red.500"} fontSize="xs" fontWeight={"bold"}>unsaved changes!</Text>
              )}
            </HStack>
          </>
        ) : (
          <Box position="relative" width="100%">
            <Box
              marginTop={2}
              border='1px solid #aaa'
              borderRadius='lg'
              minHeight={500}
              maxHeight={500}
              bg={"#fefefe"}
              p={4}
              width={"100%"}
              overflow={"auto"}
            >
              {customInstructions ? (
                <Markdown content={customInstructions} />
              ) : (
                <Text color={"gray.500"} fontSize="sm">No additional context provided</Text>
              )}
            </Box>
            <Box
              position="absolute"
              bottom={3}
              right={3}
              bg="rgba(255, 255, 255, 0.9)"
              px={2}
              py={1}
              borderRadius="md"
              fontSize="xs"
              color="gray.600"
              border="1px solid"
              borderColor="gray.300"
              fontWeight="medium"
            >
              {customInstructions.trim().split(/\s+/).filter(word => word.length > 0).length} words
              <Text as="span" color="green.600" ml={2}>• Saved</Text>
            </Box>
          </Box>
        )}
      </VStack>
    </VStack>
  );
};

export default AdditionalContext;
