import React from "react"
import { Text, HStack, Switch, Box, VStack, Button, IconButton } from "@chakra-ui/react";
import { BsTrash } from 'react-icons/bs';
import { getParsedIframeInfo } from "../../helpers/origin"
import { AdditionalContext } from '../common/AdditionalContext';
import { DisabledOverlay } from '../common/DisabledOverlay';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setUseMemory, removeSavedQuestion } from '../../state/settings/reducer';



const SavedQuestions = () => {
    const savedQuestions = useSelector((state: RootState) => state.settings.savedQuestions)

    const handleDeleteQuestion = (question: string) => {
        dispatch(removeSavedQuestion(question))
    }

    return (
        <Box mt={5}>
            <Text fontSize="lg" fontWeight="bold" mb={2}>Saved Questions</Text>
            {savedQuestions.length === 0 ? (
                <Text color="gray.500" fontSize="sm" fontStyle="italic">
                    No saved questions yet
                </Text>
            ) : (
                <VStack spacing={2} align="stretch">
                    {savedQuestions.map((question, index) => (
                        <HStack
                            key={index}
                            justify="space-between"
                            align="center"
                            p={3}
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="md"
                            bg="white"
                        >
                            <Text fontSize="sm" flex={1} mr={2}>
                                {question}
                            </Text>
                            <IconButton
                                size="sm"
                                variant="ghost"
                                color="red"
                                icon={<BsTrash />}
                                onClick={() => handleDeleteQuestion(question)}
                                aria-label="Delete question"
                                _hover={{ bg: "red.100" }}
                            />
                        </HStack>
                    ))}
                </VStack>
            )}
        </Box>
    )
}


export const MinusXMD: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    const useMemory = useSelector((state: RootState) => state.settings.useMemory)
    
    const handleMemoryToggle = (checked: boolean) => {
        dispatch(setUseMemory(checked))
    }
    
    if (tool != 'metabase') {
        return <Text>Coming soon!</Text>
    }

    return <>
        <HStack justify="space-between" align="center" mb={4}>
            <Text fontSize="2xl" fontWeight="bold">Memory</Text>
            <HStack spacing={3} align="center">
                <HStack spacing={2} align="center">
                    <Text fontSize="xs" color="minusxGreen.600" fontWeight="bold">
                        USE MEMORY
                    </Text>
                    <Switch 
                        colorScheme="minusxGreen" 
                        size="sm" 
                        isChecked={useMemory} 
                        onChange={(e) => handleMemoryToggle(e.target.checked)}
                    />
                </HStack>
            </HStack>
        </HStack>
        
        <Box position="relative">
            <AdditionalContext />
            <SavedQuestions />
            {!useMemory && (
                <DisabledOverlay 
                    toolEnabledReason="Turn on the **USE MEMORY** switch above to let MinusX use your memories and preferences in context." 
                    local={true}
                />
            )}
        </Box>
    </>
}