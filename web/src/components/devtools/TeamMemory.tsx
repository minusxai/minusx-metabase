import React, { useEffect, useState } from "react"
import { Text, Box, HStack, Badge, VStack, Spinner, Menu, MenuButton, MenuList, MenuItem, Button, Icon, Switch, Mark, Link, Accordion, AccordionItem, AccordionButton, AccordionPanel } from "@chakra-ui/react";
import { BiChevronDown, BiChevronRight, BiCheck, BiBuildings, BiGroup } from "react-icons/bi";
import { BsFillPatchQuestionFill } from "react-icons/bs";
import { getParsedIframeInfo } from "../../helpers/origin"
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setSelectedAssetId, setUseTeamMemory } from '../../state/settings/reducer';
import { CodeBlock } from '../common/CodeBlock';
import { DisabledOverlay } from '../common/DisabledOverlay';
import { Markdown } from '../common/Markdown';
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
const useAppStore = getApp().useStore()
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

// type AssetType = 'context' | 'notes' | 'scheduled_report' | 'alert'

export const TeamMemory: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    const isEmbedded = getParsedIframeInfo().isEmbedded as unknown === 'true'
    const availableAssets = useSelector((state: RootState) => state.settings.availableAssets).filter((asset) => asset?.type === 'context')
    const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
    const assetsLoading = useSelector((state: RootState) => state.settings.assetsLoading)
    const useTeamMemory = useSelector((state: RootState) => state.settings.useTeamMemory)
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const dbInfo = toolContext.dbInfo
    const allTables = dbInfo.tables || []
    const allModels = dbInfo.models|| []

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

    // Extract whitelist and blacklist entities for current database
    const assetContent = selectedAsset?.content as any;
    const whiteListedEntities = assetContent?.entity_whitelist?.filter((entity: any) => entity.database_id === dbInfo.id) || []
    const blackListedEntities = assetContent?.entity_blacklist?.filter((entity: any) => entity.database_id === dbInfo.id) || []

    const whiteListedTableIds = whiteListedEntities.filter((entity: any) => entity.type === 'table').map((entity: any) => String(entity.id))
    const whiteListedModelIds = whiteListedEntities.filter((entity: any) => entity.type === 'model').map((entity: any) => String(entity.id))

    const blackListedTableIds = blackListedEntities.filter((entity: any) => entity.type === 'table').map((entity: any) => String(entity.id))
    const blacListedModelIds = blackListedEntities.filter((entity: any) => entity.type === 'model').map((entity: any) => String(entity.id))

    // Apply filtering: whitelist takes precedence over blacklist
    let finTables, finModels;

    if (whiteListedTableIds.length > 0) {
      // Whitelist exists - only show whitelisted tables
      finTables = allTables.filter(table => whiteListedTableIds.includes(String(table.id))).sort((a, b) => a.schema.localeCompare(b.schema) || a.name.localeCompare(b.name))
    } else {
      // No whitelist - apply blacklist
      finTables = allTables.filter(table => !blackListedTableIds.includes(String(table.id))).sort((a, b) => a.schema.localeCompare(b.schema) || a.name.localeCompare(b.name))
    }

    if (whiteListedModelIds.length > 0) {
      // Whitelist exists - only show whitelisted models
      finModels = allModels.filter(model => whiteListedModelIds.includes(String(model.modelId))).filter(model => model.dbId === dbInfo.id).sort((a, b) => String(a.collectionName).localeCompare(String(b.collectionName)) || a.name.localeCompare(b.name))
    } else {
      // No whitelist - apply blacklist
      finModels = allModels.filter(model => !blacListedModelIds.includes(String(model.modelId))).filter(model => model.dbId === dbInfo.id).sort((a, b) => String(a.collectionName).localeCompare(String(b.collectionName)) || a.name.localeCompare(b.name))
    }

    return <>
        <VStack width={"100%"} align="stretch" spacing={0} mb={2}>
        <HStack justify="space-between" align="center" width={"100%"}>
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
        { !isEmbedded && <HStack>
            <Link href={"https://docs.minusx.ai/en/articles/12426829-team-memory"} isExternal display={"flex"} alignItems={"center"} fontSize="xs" color="minusxGreen.800" fontWeight={"bold"} textDecoration={"underline"}>What is "Team Memory" and how to set it up? <BsFillPatchQuestionFill /></Link>
        </HStack>}
        </VStack>
        
        {/* Asset Selection Section */}
        <Box position="relative" minH={"500px"}>
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
                            <HStack spacing={4} width={"100%"} justify="space-between">
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
                                
{selectedAsset.content && !(selectedAsset.content as any).isActive && (
                                    <VStack align="start" spacing={0}>
                                        <Text fontSize="xs" color="gray.500" fontWeight="medium">STATUS</Text>
                                        <Text fontSize="sm" fontWeight="medium" color="orange.600">
                                            Draft
                                        </Text>
                                    </VStack>
                                )}
                            
                            <VStack align="end" spacing={0}>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">TYPE</Text>
                                <Badge colorScheme="green" variant="subtle" size="sm">
                                    {selectedAsset.type}
                                </Badge>
                            </VStack>
                            </HStack>
                        </HStack>
                        
                        <HStack justify="space-between" align="center" pt={1}>
                            <Text fontSize="xs" color="gray.500">
                                Last updated: {new Date(selectedAsset.updated_at).toLocaleDateString()}
                            </Text>
                        </HStack>
                    </VStack>
                    
                    <AssetContentDisplay asset={selectedAsset} finTables={finTables} finModels={finModels} />
                </VStack>
            )}
            
            {/* Empty State */}
            {availableAssets.length === 0 && !assetsLoading && (
                <VStack spacing={2} py={8} textAlign="center">
                    <Text fontSize="sm" color="gray.600" fontWeight="medium">
                        No Assets Available
                    </Text>
                    <Text fontSize="xs" color="gray.500" lineHeight="1.4" maxWidth="300px">
                        {isEmbedded ? "" : "Contact MinusX to set up your organization's assets and unlock enhanced AI context capabilities."}
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
                    toolEnabledReason={isEmbedded ? "Turn on the **USE TEAM MEMORY** switch above to let the AI use your organization's assets and team context." : "Turn on the **USE TEAM MEMORY** switch above to let MinusX use your organization's assets and team context."}
                    local={true}
                />
            )}
        </Box>
    </>
}

// Component to display asset content based on type
const AssetContentDisplay: React.FC<{ asset: any; finTables: any[]; finModels: any[] }> = ({ asset, finTables, finModels }) => {
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
                    <Accordion allowMultiple defaultIndex={[0]}>
                        <AccordionItem>
                            {({ isExpanded }) => (
                                <>
                                    <AccordionButton>
                                        <Box as="span" flex="1" textAlign="left">
                                            <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                                Text Context
                                            </Text>
                                        </Box>
                                        <Icon as={isExpanded ? BiChevronDown : BiChevronRight} />
                                    </AccordionButton>
                                    <AccordionPanel pb={4}>
                                        <Box
                                            maxHeight="200px"
                                            overflowY="auto"
                                        >
                                            {asset.content.text && asset.content.text.trim() !== '' ? <Markdown content={asset.content.text} /> : <Markdown content="> Note: Text context is empty" />}
                                        </Box>
                                    </AccordionPanel>
                                </>
                            )}
                        </AccordionItem>

                        {finTables && finTables.length > 0 && (
                            <AccordionItem>
                                {({ isExpanded }) => (
                                    <>
                                        <AccordionButton>
                                            <Box as="span" flex="1" textAlign="left">
                                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                                    Filtered Tables ({finTables.length})
                                                </Text>
                                            </Box>
                                            <Icon as={isExpanded ? BiChevronDown : BiChevronRight} />
                                        </AccordionButton>
                                        <AccordionPanel pb={4}>
                                            <VStack align="stretch" spacing={2} maxHeight="200px" overflowY="auto">
                                                {finTables.map((table, index) => (
                                                    <HStack
                                                        key={index}
                                                        pb={2}
                                                        borderBottom="1px solid"
                                                        borderColor="gray.200"
                                                        borderRadius="md"
                                                        spacing={3}
                                                        justify="flex-start"
                                                    >
                                                        <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                                            {table.name}
                                                        </Text>
                                                        <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                                                            ID: {table.id}
                                                        </Badge>
                                                        {table.schema && (
                                                            <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                                                                Schema: {table.schema}
                                                            </Badge>
                                                        )}
                                                    </HStack>
                                                ))}
                                            </VStack>
                                        </AccordionPanel>
                                    </>
                                )}
                            </AccordionItem>
                        )}

                        {finModels && finModels.length > 0 && (
                            <AccordionItem>
                                {({ isExpanded }) => (
                                    <>
                                        <AccordionButton>
                                            <Box as="span" flex="1" textAlign="left">
                                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                                    Filtered Models ({finModels.length})
                                                </Text>
                                            </Box>
                                            <Icon as={isExpanded ? BiChevronDown : BiChevronRight} />
                                        </AccordionButton>
                                        <AccordionPanel pb={4}>
                                            <VStack align="stretch" spacing={2} maxHeight="200px" overflowY="auto">
                                                {finModels.map((model, index) => (
                                                    <HStack
                                                        key={index}
                                                        pb={2}
                                                        borderBottom="1px solid"
                                                        borderColor="gray.200"
                                                        borderRadius="md"
                                                        spacing={3}
                                                        justify="flex-start"
                                                    >
                                                        <Text fontSize="sm" fontWeight="medium" color="gray.800">
                                                            {model.name}
                                                        </Text>
                                                        <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                                                            ID: {model.modelId}
                                                        </Badge>
                                                        <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                                                            Collection: {model.collectionName}
                                                        </Badge>
                                                    </HStack>
                                                ))}
                                            </VStack>
                                        </AccordionPanel>
                                    </>
                                )}
                            </AccordionItem>
                        )}

                        {asset.content.questions && asset.content.questions.length > 0 && (
                            <AccordionItem>
                                {({ isExpanded }) => (
                                    <>
                                        <AccordionButton>
                                            <Box as="span" flex="1" textAlign="left">
                                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                                    Saved Questions ({asset.content.questions.length})
                                                </Text>
                                            </Box>
                                            <Icon as={isExpanded ? BiChevronDown : BiChevronRight} />
                                        </AccordionButton>
                                        <AccordionPanel pb={4}>
                                            <VStack align="stretch" spacing={2}>
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
                                        </AccordionPanel>
                                    </>
                                )}
                            </AccordionItem>
                        )}

                        {asset.content.helpertexts && asset.content.helpertexts.length > 0 && (
                            <AccordionItem>
                                {({ isExpanded }) => (
                                    <>
                                        <AccordionButton>
                                            <Box as="span" flex="1" textAlign="left">
                                                <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                                                    Helper Texts ({asset.content.helpertexts.length})
                                                </Text>
                                            </Box>
                                            <Icon as={isExpanded ? BiChevronDown : BiChevronRight} />
                                        </AccordionButton>
                                        <AccordionPanel pb={4}>
                                            <VStack align="stretch" spacing={2}>
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
                                        </AccordionPanel>
                                    </>
                                )}
                            </AccordionItem>
                        )}
                    </Accordion>
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
        </VStack>
    );
};