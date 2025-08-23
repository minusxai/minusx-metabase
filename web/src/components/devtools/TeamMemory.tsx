import React, { useEffect, useState } from "react"
import { Text, Box, HStack, Badge, VStack, Spinner, Menu, MenuButton, MenuList, MenuItem, Button, Icon, Switch } from "@chakra-ui/react";
import { BiChevronDown, BiCheck, BiTime, BiBuildings, BiGroup } from "react-icons/bi";
import { getParsedIframeInfo } from "../../helpers/origin"
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setSelectedAssetId, setUseTeamMemory } from '../../state/settings/reducer';
import { Notify } from '../common/Notify';
import { CodeBlock } from '../common/CodeBlock';
import { DisabledOverlay } from '../common/DisabledOverlay';
import { Markdown } from '../common/Markdown';

export const TeamMemory: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
    const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
    const assetsLoading = useSelector((state: RootState) => state.settings.assetsLoading)
    const useTeamMemory = useSelector((state: RootState) => state.settings.useTeamMemory)

    // Auto-select first asset when assets are loaded and none is selected
    React.useEffect(() => {
        if (availableAssets.length > 0 && !selectedAssetId) {
            dispatch(setSelectedAssetId(availableAssets[0].slug))
        }
    }, [availableAssets, selectedAssetId])
    
    const handleAssetSelection = (assetSlug: string) => {
        dispatch(setSelectedAssetId(assetSlug === '' ? null : assetSlug))
    }
    
    const handleMemoryToggle = (checked: boolean) => {
        dispatch(setUseTeamMemory(checked))
    }
    
    // Find the selected asset for display, fallback to first asset if available
    const selectedAsset = availableAssets.find(asset => asset.slug === selectedAssetId) || 
                         (availableAssets.length > 0 ? availableAssets[0] : null)
    
    if (tool != 'metabase') {
        return <Text>Coming soon!</Text>
    }

    return <>
        <HStack justify="space-between" align="center" mb={4}>
            <Text fontSize="2xl" fontWeight="bold">Team Memory</Text>
            <HStack spacing={3} align="center">
                <HStack spacing={2} align="center">
                    <Text fontSize="xs" color="minusxGreen.600" fontWeight="bold">
                        USE TEAM MEMORY
                    </Text>
                    <Switch 
                        colorScheme="minusxGreen" 
                        size="sm" 
                        isChecked={useTeamMemory} 
                        onChange={(e) => handleMemoryToggle(e.target.checked)}
                    />
                </HStack>
            </HStack>
        </HStack>
        
        {/* Asset Selection Section */}
        <Box position="relative">
            <VStack align="stretch" spacing={4} mb={4}>
            <VStack align="stretch" spacing={2}>
                {assetsLoading ? (
                    <Box textAlign="center">
                        <Spinner size="sm" color="minusxGreen.500" />
                    </Box>
                ) : availableAssets.length > 0 ? (
                    <Menu>
                        <MenuButton
                            as={Button}
                            rightIcon={<BiChevronDown />}
                            size="sm"
                            width="100%"
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            color="minusxBW.800"
                            _hover={{
                                bg: "gray.50",
                                borderColor: "gray.300"
                            }}
                            _active={{
                                bg: "gray.100",
                                borderColor: "gray.400"
                            }}
                            fontWeight="normal"
                            textAlign="left"
                            justifyContent="space-between"
                        >
                            {selectedAsset?.name || availableAssets[0]?.name}
                        </MenuButton>
                        <MenuList
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            boxShadow="lg"
                            borderRadius="md"
                            py={1}
                            width={"100%"}
                        >
                            {availableAssets.map((asset) => (
                                <MenuItem
                                    key={asset.slug}
                                    onClick={() => handleAssetSelection(asset.slug)}
                                    bg="white"
                                    _hover={{
                                        bg: "gray.50"
                                    }}
                                    _focus={{
                                        bg: "gray.50"
                                    }}
                                    py={2}
                                    px={3}
                                    color="minusxBW.800"
                                    fontSize="sm"
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    width={"100%"}
                                >
                                    <Text>{asset.name}</Text>
                                    {(selectedAssetId || availableAssets[0].slug) === asset.slug && (
                                        <Icon 
                                            as={BiCheck} 
                                            boxSize={4} 
                                            color="minusxGreen.500"
                                        />
                                    )}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                ) : (
                    <Text fontSize="sm" color="gray.500">
                        No assets available
                    </Text>
                )}
            </VStack>
            
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
                        
                        <HStack spacing={2} wrap="wrap">
                            <Badge colorScheme="gray" variant="subtle">
                                {selectedAsset.type}
                            </Badge>
                            <Badge variant="subtle" colorScheme="gray">
                                <HStack spacing={2}>
                                    <Icon as={BiGroup} boxSize={3} />
                                    <Text fontSize="xs">{selectedAsset.team_slug}</Text>
                                </HStack>
                            </Badge>
                            <Badge variant="subtle" colorScheme="gray">
                                <HStack spacing={2}>
                                    <Icon as={BiBuildings} boxSize={3} />
                                    <Text fontSize="xs">{selectedAsset.company_slug}</Text>
                                </HStack>
                            </Badge>
                            <Badge variant="subtle" colorScheme="gray">
                                <HStack spacing={2}>
                                    <Icon as={BiTime} boxSize={3} />
                                    <Text fontSize="xs">{new Date(selectedAsset.updated_at).toLocaleDateString()}</Text>
                                </HStack>
                            </Badge>
                        </HStack>
                        
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
            {!useTeamMemory && (
                <DisabledOverlay 
                    toolEnabledReason="Turn on the **USE TEAM MEMORY** switch above to let MinusX use your organization's assets and team context." 
                    local={true}
                />
            )}
        </Box>
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
            // Check if content has the new structure with 'text' and 'entities'
            if (asset.content && typeof asset.content === 'object') {
                return (
                    <VStack align="stretch" spacing={3}>
                        {/* Render text as markdown */}
                        <Box 
                            bg="white" 
                            p={3} 
                            borderRadius="md" 
                            border="1px solid" 
                            borderColor="gray.200"
                            maxHeight="200px"
                            overflowY="auto"
                        >
                            <Markdown content={asset.content.text === '' ? '> Note: Text context is empty' : asset.content.text} />
                        </Box>
                        
                        {/* Render entities as a list */}
                        {(
                            <Box 
                                bg="gray.50" 
                                p={3} 
                                borderRadius="md" 
                                border="1px solid" 
                                borderColor="gray.200"
                            >
                                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                                    Entities ({asset.content.entities.length})
                                </Text>
                                <VStack align="stretch" spacing={2} maxHeight="200px" overflowY="auto">
                                    {asset.content.entities.map((entity: any, index: number) => (
                                        <HStack 
                                            key={index}
                                            bg="white" 
                                            p={2} 
                                            borderRadius="sm" 
                                            border="1px solid" 
                                            borderColor="gray.200"
                                            spacing={2}
                                            justify="flex-start"
                                        >
                                            {entity.name && (
                                                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                                    {entity.name}
                                                </Text>
                                            )}
                                            {entity.id && (
                                                <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                                                    ID: {entity.id}
                                                </Badge>
                                            )}
                                            {entity.type && (
                                                <Badge colorScheme="gray" variant="outline" fontSize="xs">
                                                    {entity.type}
                                                </Badge>
                                            )}
                                        </HStack>
                                    ))}
                                </VStack>
                            </Box>
                        )}
                    </VStack>
                );
            }
            
            // Fallback for context type without new structure
            const contentString = JSON.stringify(asset.content, null, 2) || '';
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
                <CodeBlock 
                    code={JSON.stringify(asset.content, null, 2)} 
                    tool="json"
                    language="json"
                />
            );
        }
    };

    return (
        <VStack align="stretch" spacing={2}>
            {renderContent()}
            
            <Notify 
                title="Team Memory" 
                notificationType="info"
            >
                This asset's context will be included in AI requests to provide more relevant 
                and accurate responses based on your organization's specific information.
            </Notify>
        </VStack>
    );
};