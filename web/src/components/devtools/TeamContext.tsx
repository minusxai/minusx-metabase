import React, { useEffect, useState } from "react"
import { Text, Box, HStack, Badge, VStack, Select, Spinner } from "@chakra-ui/react";
import { getParsedIframeInfo } from "../../helpers/origin"
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setSelectedAssetId } from '../../state/settings/reducer';

export const TeamContext: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
    const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
    const assetsLoading = useSelector((state: RootState) => state.settings.assetsLoading)
    
    // Auto-select first asset when assets are loaded and none is selected
    React.useEffect(() => {
        if (availableAssets.length > 0 && !selectedAssetId) {
            dispatch(setSelectedAssetId(availableAssets[0].slug))
        }
    }, [availableAssets, selectedAssetId])
    
    const handleAssetSelection = (assetSlug: string) => {
        dispatch(setSelectedAssetId(assetSlug === '' ? null : assetSlug))
    }
    
    // Find the selected asset for display, fallback to first asset if available
    const selectedAsset = availableAssets.find(asset => asset.slug === selectedAssetId) || 
                         (availableAssets.length > 0 ? availableAssets[0] : null)
    
    if (tool != 'metabase') {
        return <Text>Coming soon!</Text>
    }

    return <>
        <HStack justify="space-between" align="center" mb={4}>
            <Text fontSize="2xl" fontWeight="bold">Team Context</Text>
        </HStack>
        
        {/* Asset Selection Section */}
        <VStack align="stretch" spacing={4} mb={4}>
            <Text fontSize="md" fontWeight="semibold" color="minusxBW.800">
                Organization Asset Selection
            </Text>
            
            <Box>
                <HStack justify="space-between" align="center" mb={3}>
                    <Text fontSize="sm" color="minusxBW.800">
                        Select Asset:
                    </Text>
                    {assetsLoading ? (
                        <Spinner size="sm" color="minusxGreen.500" />
                    ) : availableAssets.length > 0 ? (
                        <Select 
                            value={selectedAssetId || availableAssets[0].slug}
                            onChange={(e) => handleAssetSelection(e.target.value)}
                            size="sm"
                            maxWidth="300px"
                            color="minusxBW.800"
                        >
                            {availableAssets.map((asset) => (
                                <option key={asset.slug} value={asset.slug}>
                                    {asset.name}
                                </option>
                            ))}
                        </Select>
                    ) : (
                        <Text fontSize="sm" color="gray.500">
                            No assets available
                        </Text>
                    )}
                </HStack>
            </Box>
            
            {/* Selected Asset Details */}
            {selectedAsset && (
                <Box 
                    bg="gray.50" 
                    border="1px solid" 
                    borderColor="gray.200"
                    borderRadius="md" 
                    p={4}
                >
                    <VStack align="stretch" spacing={3}>
                        <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                            {selectedAsset.name}
                        </Text>
                        
                        <HStack spacing={2}>
                            <Badge colorScheme="blue" variant="subtle">
                                {selectedAsset.type}
                            </Badge>
                            <Badge colorScheme="green" variant="subtle">
                                {selectedAsset.permission}
                            </Badge>
                        </HStack>
                        
                        <VStack align="stretch" spacing={2}>
                            <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium" color="gray.700">Team:</Text>
                                <Text fontSize="sm" color="gray.600">{selectedAsset.team_slug}</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium" color="gray.700">Company:</Text>
                                <Text fontSize="sm" color="gray.600">{selectedAsset.company_slug}</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium" color="gray.700">Created:</Text>
                                <Text fontSize="sm" color="gray.600">
                                    {new Date(selectedAsset.created_at).toLocaleDateString()}
                                </Text>
                            </HStack>
                            <HStack justify="space-between">
                                <Text fontSize="sm" fontWeight="medium" color="gray.700">Updated:</Text>
                                <Text fontSize="sm" color="gray.600">
                                    {new Date(selectedAsset.updated_at).toLocaleDateString()}
                                </Text>
                            </HStack>
                        </VStack>
                        
                        <AssetContentDisplay asset={selectedAsset} />
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
                    p={4}
                    textAlign="center"
                >
                    <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                        No Assets Available
                    </Text>
                    <Text fontSize="xs" color="gray.500" lineHeight="1.4">
                        Contact MinusX to set up your organization's assets and unlock enhanced AI context capabilities.
                    </Text>
                </Box>
            )}
            
            {/* Loading State */}
            {assetsLoading && availableAssets.length === 0 && (
                <Box 
                    bg="gray.50" 
                    border="1px solid" 
                    borderColor="gray.200"
                    borderRadius="md" 
                    p={4}
                    textAlign="center"
                >
                    <VStack spacing={2}>
                        <Spinner size="md" color="minusxGreen.500" />
                        <Text fontSize="sm" color="gray.600">
                            Loading organization assets...
                        </Text>
                    </VStack>
                </Box>
            )}
        </VStack>
    </>
}

// Component to display asset content based on type
const AssetContentDisplay: React.FC<{ asset: any }> = ({ asset }) => {
    if (!asset.content) {
        return (
            <Box bg="blue.50" p={3} borderRadius="md" border="1px solid" borderColor="blue.200">
                <Text fontSize="xs" color="blue.700" fontWeight="medium" mb={1}>
                    Enhanced Context
                </Text>
                <Text fontSize="xs" color="blue.600" lineHeight="1.4">
                    This asset's context will be included in AI requests to provide more relevant 
                    and accurate responses based on your organization's specific information.
                </Text>
                <Text fontSize="xs" color="blue.500" fontStyle="italic" mt={2}>
                    No content available
                </Text>
            </Box>
        );
    }

    const renderContent = () => {
        if (asset.type === 'context') {
            // For context type, display the 'content' field as string
            const contentString = asset.content.content || '';
            return (
                <Box 
                    bg="white" 
                    p={3} 
                    borderRadius="md" 
                    border="1px solid" 
                    borderColor="gray.200"
                    maxHeight="400px"
                    overflowY="auto"
                >
                    <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap" lineHeight="1.5">
                        {contentString || 'No content available'}
                    </Text>
                </Box>
            );
        } else {
            // For other types, display full content as JSON
            return (
                <Box 
                    bg="gray.900" 
                    p={3} 
                    borderRadius="md" 
                    border="1px solid" 
                    borderColor="gray.300"
                    maxHeight="400px"
                    overflowY="auto"
                >
                    <Text 
                        fontSize="xs" 
                        color="green.300" 
                        fontFamily="mono"
                        whiteSpace="pre-wrap"
                        lineHeight="1.4"
                    >
                        {JSON.stringify(asset.content, null, 2)}
                    </Text>
                </Box>
            );
        }
    };

    return (
        <VStack align="stretch" spacing={2}>
            <Box bg="blue.50" p={3} borderRadius="md" border="1px solid" borderColor="blue.200">
                <Text fontSize="xs" color="blue.700" fontWeight="medium" mb={1}>
                    Enhanced Context
                </Text>
                <Text fontSize="xs" color="blue.600" lineHeight="1.4">
                    This asset's context will be included in AI requests to provide more relevant 
                    and accurate responses based on your organization's specific information.
                </Text>
            </Box>
            
            {renderContent()}
        </VStack>
    );
};