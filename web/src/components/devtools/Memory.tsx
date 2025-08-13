import React from "react"
import { Text, HStack, Switch } from "@chakra-ui/react";
import { getParsedIframeInfo } from "../../helpers/origin"
import { AdditionalContext } from '../common/AdditionalContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setUseMemory } from '../../state/settings/reducer';

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
        
        <AdditionalContext />
    </>
}