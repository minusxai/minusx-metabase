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
        <VStack spacing={6} align="stretch" pt={6}>
            <Text fontSize="2xl" fontWeight="bold">Context</Text>
            <Box position="relative">
                <TablesCatalog />
                {!manualContext && (
                    <DisabledOverlay 
                        toolEnabledReason="Explorer agent automatically figures out context for you." 
                        local={true}
                    />
                )}
            </Box>
            <HStack justify="center" mt={4}>
                <Text fontSize="sm" color="gray.600">Manually select tables/models</Text>
                <Switch 
                    isChecked={manualContext} 
                    onChange={updateSelection}
                    colorScheme="minusxGreen"
                    size="md"
                />
            </HStack>
        </VStack>
    )
}