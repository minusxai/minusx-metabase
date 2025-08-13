import React from "react"
import { Text, Box, Button, VStack, HStack } from "@chakra-ui/react";
import { dispatch } from '../../state/dispatch';
import { updateDevToolsTabName } from "../../state/settings/reducer";
import { BiRightArrowAlt } from "react-icons/bi";

export const Context: React.FC = () => {
    const handleGoToMemory = () => {
        dispatch(updateDevToolsTabName('Memory'));
    }

    return (
        <VStack spacing={6} align="stretch" pt={6}>
            <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" mb={2}>Context Management</Text>
                <Text fontSize="lg" color="gray.600">
                    Context management has been moved and improved!
                </Text>
            </Box>
            
            <Box 
                bg="minusxGreen.50" 
                border="2px solid"
                borderColor="minusxGreen.200" 
                borderRadius="lg" 
                p={6}
                textAlign="center"
            >
                <VStack spacing={4}>
                    <Text fontSize="md" fontWeight="semibold" color="minusxGreen.800">
                        🎉 New Asset Context System
                    </Text>
                    <Text fontSize="sm" color="minusxGreen.700" lineHeight="1.6">
                        The new asset selection system is now available in the <strong>Memory</strong> tab. 
                        You can select your organization's assets to provide enhanced context for AI responses.
                    </Text>
                    <Button 
                        colorScheme="minusxGreen" 
                        size="md"
                        rightIcon={<BiRightArrowAlt />}
                        onClick={handleGoToMemory}
                    >
                        Go to Memory Tab
                    </Button>
                </VStack>
            </Box>
            
            <Box 
                bg="gray.50" 
                border="1px solid"
                borderColor="gray.200" 
                borderRadius="md" 
                p={4}
                fontSize="sm"
                color="gray.600"
            >
                <Text fontWeight="semibold" mb={2}>What changed:</Text>
                <VStack align="start" spacing={1} pl={2}>
                    <Text>• Manual catalog management has been deprecated</Text>
                    <Text>• Asset context is now managed through your organization's asset system</Text>
                    <Text>• Enhanced context selection with company and team information</Text>
                    <Text>• Improved AI responses with structured asset context</Text>
                </VStack>
            </Box>
        </VStack>
    )
}