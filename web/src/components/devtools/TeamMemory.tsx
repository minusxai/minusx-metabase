import React, { useEffect, useState } from "react"
import { Text, Box, HStack, Badge, VStack, Spinner, Menu, MenuButton, MenuList, MenuItem, Button, Icon, Switch, Mark } from "@chakra-ui/react";
import { BiChevronDown, BiCheck, BiBuildings, BiGroup } from "react-icons/bi";
import { getParsedIframeInfo } from "../../helpers/origin"
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setSelectedAssetId, setUseTeamMemory } from '../../state/settings/reducer';
import { CodeBlock } from '../common/CodeBlock';
import { DisabledOverlay } from '../common/DisabledOverlay';
import { Markdown } from '../common/Markdown';
import { Notify } from '../common/Notify';


interface Question {
    content: string;
    source_url: string;
    is_published: boolean;
}

interface HelperText {
    text: string;
    url: string;
    is_published: boolean;
}

export const TeamMemory: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
    const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
    const assetsLoading = useSelector((state: RootState) => state.settings.assetsLoading)
    const useTeamMemory = useSelector((state: RootState) => state.settings.useTeamMemory)

    
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
                                    key={`${asset.company_slug}-${asset.slug}`}
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
                <VStack align="stretch" spacing={4}>
                    {/* Asset Header with clear team/org info */}
                    <VStack align="stretch" spacing={2}>
                        <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                            {selectedAsset.name}
                        </Text>
                        
                        <HStack justify="space-between" align="center">
                            <HStack spacing={4}>
                                <VStack align="start" spacing={0}>
                                    <Text fontSize="xs" color="gray.500" fontWeight="medium">TEAM</Text>
                                    <HStack spacing={1} align="center">
                                        <Icon as={BiGroup} boxSize={3} color="gray.600" />
                                        <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                            {selectedAsset.team_slug}
                                        </Text>
                                    </HStack>
                                </VStack>
                                
                                <VStack align="start" spacing={0}>
                                    <Text fontSize="xs" color="gray.500" fontWeight="medium">ORGANIZATION</Text>
                                    <HStack spacing={1} align="center">
                                        <Icon as={BiBuildings} boxSize={3} color="gray.600" />
                                        <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                            {selectedAsset.company_slug}
                                        </Text>
                                    </HStack>
                                </VStack>
                                
{selectedAsset.content && !selectedAsset.content.isActive && (
                                    <VStack align="start" spacing={0}>
                                        <Text fontSize="xs" color="gray.500" fontWeight="medium">STATUS</Text>
                                        <Text fontSize="sm" fontWeight="medium" color="orange.600">
                                            Draft
                                        </Text>
                                    </VStack>
                                )}
                            </HStack>
                            
                            <VStack align="end" spacing={0}>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">TYPE</Text>
                                <Badge colorScheme="green" variant="subtle" size="sm">
                                    {selectedAsset.type}
                                </Badge>
                            </VStack>
                        </HStack>
                        
                        <HStack justify="space-between" align="center" pt={1}>
                            <Text fontSize="xs" color="gray.500">
                                Last updated: {new Date(selectedAsset.updated_at).toLocaleDateString()}
                            </Text>
                        </HStack>
                    </VStack>
                    
                    <AssetContentDisplay asset={selectedAsset} />
                </VStack>
            )}
            
            {/* Empty State */}
            {availableAssets.length === 0 && !assetsLoading && (
                <VStack spacing={2} py={8} textAlign="center">
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                        No Assets Available
                    </Text>
                    <Text fontSize="xs" color="gray.500" lineHeight="1.4" maxWidth="300px">
                        Contact MinusX to set up your organization's assets and unlock enhanced AI context capabilities.
                    </Text>
                </VStack>
            )}
            
            {/* Loading State */}
            {assetsLoading && availableAssets.length === 0 && (
                <VStack spacing={3} py={8} textAlign="center">
                    <Spinner size="md" color="minusxGreen.500" />
                    <Text fontSize="sm" color="gray.600">
                        Loading organization assets...
                    </Text>
                </VStack>
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
            <VStack spacing={2} py={4} align="start">
                <Text fontSize="xs" color="blue.700" fontWeight="medium">
                    Enhanced Context
                </Text>
                <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                    This asset's context will be included in AI requests to provide more relevant 
                    and accurate responses based on your organization's specific information.
                </Text>
                <Text fontSize="xs" color="gray.500" fontStyle="italic">
                    No content available
                </Text>
            </VStack>
        );
    }

    const renderContent = () => {
        if (asset.type === 'context') {
            // Check if content has the new structure with 'text' and 'entities'
            if (asset.content && typeof asset.content === 'object') {
                return (
                    <VStack align="stretch" spacing={4}>
                        {/* Render text as markdown */}
                        <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                            Text Context
                        </Text>
                        <Box 
                            border="1px solid" 
                            borderColor="gray.200"
                            borderRadius="md" 
                            p={3}
                            maxHeight="200px"
                            overflowY="auto"
                        >
                            {asset.content.text && asset.content.text.trim() !== '' ? <Markdown content={asset.content.text} /> : <Markdown content="> Note: Text context is empty" />}
                        </Box>
                        
                        {/* Render entities as a list */}
                        {asset.content.entities && asset.content.entities.length > 0 && (
                            <VStack align="stretch" spacing={3}>
                                <Text fontSize="sm" fontWeight="semibold" color="gray.700" borderTop="1px solid" borderColor="gray.300" pt={5}>
                                    Entities ({asset.content.entities.length})
                                </Text>
                                <VStack align="stretch" spacing={2} maxHeight="200px" overflowY="auto">
                                    {asset.content.entities.map((entity: any, index: number) => (
                                        <HStack 
                                            key={index}
                                            p={3}
                                            border="1px solid" 
                                            borderColor="gray.200"
                                            borderRadius="md"
                                            spacing={3}
                                            justify="flex-start"
                                        >
                                            {entity.name && (
                                                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                                    {entity.name}
                                                </Text>
                                            )}
                                            {entity.id && (
                                                <Badge colorScheme="green" variant="subtle" fontSize="xs">
                                                    ID: {entity.id}
                                                </Badge>
                                            )}
                                            {entity.type && (
                                                <Badge colorScheme="red" variant="subtle" fontSize="xs">
                                                    {entity.type}
                                                </Badge>
                                            )}
                                        </HStack>
                                    ))}
                                </VStack>
                            </VStack>
                        )}

                        {
                            asset.content.questions && asset.content.questions.length > 0 && (
                                <VStack align="stretch" spacing={3} borderTop="1px solid" borderColor="gray.300" pt={5}>
                                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                        Saved Questions ({asset.content.questions.length})
                                    </Text>
                                    {asset.content.questions.map((question: Question, index: number) => (
                                        <VStack 
                                            key={index}
                                            p={3}
                                            border="1px solid" 
                                            borderColor="gray.200"
                                            borderRadius="md"
                                            spacing={2}
                                            align="flex-start"
                                        >
                                            {question.content && (
                                                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                                    {question.content}
                                                </Text>
                                            )}
                                            {question.source_url && (
                                                <Text fontSize="xs" color="blue.600" textDecoration="underline">
                                                    {question.source_url}
                                                </Text>
                                            )}
                                            {question.is_published !== undefined && (
                                                <Badge colorScheme={question.is_published ? "green" : "orange"} variant="subtle" fontSize="xs">
                                                    {question.is_published ? "Published" : "Draft"}
                                                </Badge>
                                            )}
                                        </VStack>
                                    ))}
                                </VStack>
                            )}

                        {
                            asset.content.helpertexts && asset.content.helpertexts.length > 0 && (
                                <VStack align="stretch" spacing={3} borderTop="1px solid" borderColor="gray.300" pt={5}>
                                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                        Helper Texts ({asset.content.helpertexts.length})
                                    </Text>
                                    {asset.content.helpertexts.map((helperText: HelperText, index: number) => (
                                        <VStack 
                                            key={index}
                                            p={3}
                                            border="1px solid" 
                                            borderColor="gray.200"
                                            borderRadius="md"
                                            spacing={2}
                                            align="flex-start"
                                        >
                                            {helperText.text && (
                                                <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                                    {helperText.text}
                                                </Text>
                                            )}
                                            {helperText.url && (
                                                <Text fontSize="xs" color="blue.600" textDecoration="underline">
                                                    {helperText.url}
                                                </Text>
                                            )}
                                            {helperText.is_published !== undefined && (
                                                <Badge colorScheme={helperText.is_published ? "green" : "orange"} variant="subtle" fontSize="xs">
                                                    {helperText.is_published ? "Published" : "Draft"}
                                                </Badge>
                                            )}
                                        </VStack>
                                    ))}
                                </VStack>
                            )}
                    </VStack>
                );
            }
            
            // Fallback for context type without new structure
            const contentString = JSON.stringify(asset.content, null, 2) || '';
            return (
                <Box 
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
        <VStack align="stretch" spacing={3}>
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