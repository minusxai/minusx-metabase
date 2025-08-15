import React from "react"
import { Text, VStack, Switch, Box, HStack } from "@chakra-ui/react";
import { TablesCatalog } from '../common/TablesCatalog';
import { DisabledOverlay } from '../common/DisabledOverlay';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { updateManualContextSelection } from '../../state/settings/reducer';

export const Context: React.FC = () => {
    const manualContext = useSelector((state: RootState) => state.settings.manuallyLimitContext)

    const updateSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked
        dispatch(updateManualContextSelection(isChecked))
    }

    return (
        <VStack spacing={6} align="stretch">
            <HStack justify="space-between" align="center">
                <Text fontSize="2xl" fontWeight="bold">Context</Text>
                <HStack spacing={3} align="center">
                    <HStack spacing={2} align="center">
                        <Text fontSize="xs" color="minusxGreen.600" fontWeight="bold">
                            MANUALLY SELECT TABLES/MODELS
                        </Text>
                        <Switch 
                            colorScheme="minusxGreen" 
                            size="sm" 
                            isChecked={manualContext} 
                            onChange={updateSelection}
                        />
                    </HStack>
                </HStack>
            </HStack>
            
            <Box position="relative">
                <TablesCatalog />
                {!manualContext && (
                    <DisabledOverlay 
                        toolEnabledReason="Explorer agent automatically figures out context for you." 
                        local={true}
                    />
                )}
            </Box>
        </VStack>
    )
}