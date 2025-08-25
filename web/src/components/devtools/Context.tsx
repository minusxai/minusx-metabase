import React from "react"
import { Text, VStack, Switch, Box, HStack, Button } from "@chakra-ui/react";
import { TablesCatalog } from '../common/TablesCatalog';
import { DisabledOverlay } from '../common/DisabledOverlay';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { updateManualContextSelection } from '../../state/settings/reducer';
import { isEmpty } from "lodash";
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { fetchModelInfo, getDatabaseTablesAndModelsWithoutFields } from "apps";
import { processAllMetadata } from "../../helpers/metadataProcessor";


const useAppStore = getApp().useStore()

export const Context: React.FC = () => {
    const manualContext = useSelector((state: RootState) => state.settings.manuallyLimitContext)
    const metadataProcessingCache = useSelector((state: RootState) => state.settings.metadataProcessingCache)

    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const dbInfo = toolContext.dbInfo
    
    
    const updateSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked
        dispatch(updateManualContextSelection(isChecked))
    }

     const syncModels = async () => {
        const currentDbId = toolContext.dbId
        if (!currentDbId) return
    
        const appState = useAppStore.getState()
    
        try {
          const updatedDbInfo = await getDatabaseTablesAndModelsWithoutFields(currentDbId, true)
          
          appState.update((oldState) => ({
            ...oldState,
            toolContext: {
              ...oldState.toolContext,
              dbInfo: updatedDbInfo,
              loading: false
            }
          }))
          // invalidate cache for model info as well
          const modelIds = updatedDbInfo.models.map((model) => model.modelId)
          const allPromises = modelIds.map((modelId) => fetchModelInfo.invalidate({model_id: modelId}))
          await Promise.all(allPromises)
        } catch (error) {
        }
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
            <VStack justifyContent={"flex-end"}>
                { isEmpty(metadataProcessingCache[dbInfo.id]) ? <Text>Syncing...</Text> : <Text fontSize={"xs"} color={"minusxGreen.600"}>Last synced: {new Date(metadataProcessingCache[dbInfo.id].timestamp).toLocaleString()}</Text> }
                <Button size={'sm'} colorScheme="minusxGreen" onClick={() => {
                syncModels()
                processAllMetadata(true, toolContext?.dbId || undefined)
                }}>Resync</Button>
            </VStack>
        </VStack>
    )
}