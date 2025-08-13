import React, { useEffect, useState } from "react"
import { Text, Box, HStack, Switch, Badge, VStack, Select, Spinner } from "@chakra-ui/react";
import { getParsedIframeInfo } from "../../helpers/origin"
import _ from 'lodash';
import { AdditionalContext } from '../common/AdditionalContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setUseMemory, setSelectedAssetId } from '../../state/settings/reducer';

export const MinusXMD: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    const useMemory = useSelector((state: RootState) => state.settings.useMemory)
    const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
    const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
    const assetsLoading = useSelector((state: RootState) => state.settings.assetsLoading)
    
    const handleMemoryToggle = (checked: boolean) => {
        dispatch(setUseMemory(checked))
    }
    
    const handleAssetSelection = (assetSlug: string) => {
        dispatch(setSelectedAssetId(assetSlug === '' ? null : assetSlug))
    }
    
    // Find the selected asset for display
    const selectedAsset = availableAssets.find(asset => asset.slug === selectedAssetId)
    
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
        
        {/* Asset Selection Section */}
        <VStack align="stretch" spacing={3} mb={4}>
            <Text fontSize="md" fontWeight="semibold" color="minusxBW.800">
                Asset Context
            </Text>
            
            <HStack justify="space-between" align="center">
                <Text fontSize="sm" color="minusxBW.800">
                    Select Asset:
                </Text>
                {assetsLoading ? (
                    <Spinner size="sm" color="minusxGreen.500" />
                ) : (
                    <Select 
                        placeholder="No asset selected"
                        value={selectedAssetId || ''}
                        onChange={(e) => handleAssetSelection(e.target.value)}
                        size="sm"
                        maxWidth="250px"
                        color="minusxBW.800"
                    >
                        {availableAssets.map((asset) => (
                            <option key={asset.slug} value={asset.slug}>
                                {asset.name}
                            </option>
                        ))}
                    </Select>
                )}
            </HStack>
            
            {/* Selected Asset Info */}
            {selectedAsset && (
                <Box 
                    bg="minusxGreen.50" 
                    border="1px solid" 
                    borderColor="minusxGreen.200"
                    borderRadius="md" 
                    p={3}
                >
                    <VStack align="stretch" spacing={1}>
                        <Text fontSize="sm" fontWeight="semibold" color="minusxGreen.800">
                            Asset: {selectedAsset.name}
                        </Text>
                        <Text fontSize="xs" color="minusxGreen.700">
                            Team: {selectedAsset.team_slug}
                        </Text>
                        <Text fontSize="xs" color="minusxGreen.700">
                            Company: {selectedAsset.company_slug}
                        </Text>
                        <Text fontSize="xs" color="minusxGreen.600" fontStyle="italic">
                            This asset context will be included in AI requests for enhanced responses.
                        </Text>
                    </VStack>
                </Box>
            )}
            
            {/* Empty State */}
            {availableAssets.length === 0 && !assetsLoading && (
                <Box 
                    bg="gray.50" 
                    border="1px solid" 
                    borderColor="gray.200"
                    borderRadius="md" 
                    p={3}
                >
                    <Text fontSize="xs" color="gray.600" textAlign="center">
                        No assets available. Contact MinusX to set up your organization.
                    </Text>
                </Box>
            )}
        </VStack>
        
        <AdditionalContext />
    </>
}