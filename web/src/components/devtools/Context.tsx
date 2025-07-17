import React, { useEffect, useState } from "react"
import { TablesCatalog } from '../common/TablesCatalog';
import { CatalogEditor, createCatalog } from '../common/CatalogEditor';
import { refreshMemberships, YAMLCatalog } from '../common/YAMLCatalog';
import { getApp } from '../../helpers/app';
import { Text, Badge, Select, Spacer, Box, Button, HStack, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, useDisclosure, IconButton, Link, Spinner, Checkbox} from "@chakra-ui/react";
import { DEFAULT_TABLES, setSelectedCatalog, saveCatalog, updateManualContextSelection } from "../../state/settings/reducer";
import { ContextCatalog } from '../../helpers/utils';
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty, set } from 'lodash';
import { MetabaseContext } from 'apps/types';
import { BiBook, BiExpand } from "react-icons/bi";
import { BsMagic, BsRocketTakeoffFill } from "react-icons/bs";
import { MetabaseAppStateDashboard } from "../../../../apps/src/metabase/helpers/DOMToState";
import { getLLMResponse } from "../../app/api";
import _ from 'lodash';



const useAppStore = getApp().useStore()

const CatalogDisplay = ({isInModal, modalOpen}: {isInModal: boolean, modalOpen: () => void}) => {
    const [isCreatingCatalog, setIsCreatingCatalog] = useState(false);
    const [isCreatingDashboardToCatalog, setIsCreatingDashboardToCatalog] = useState(false);
    const selectedCatalog: string = useSelector((state: RootState) => state.settings.selectedCatalog)
    const availableCatalogs: ContextCatalog[] = useSelector((state: RootState) => state.settings.availableCatalogs)
    const currentUserId = useSelector((state: RootState) => state.auth.profile_id)
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const viewAllCatalogs = useSelector((state: RootState) => state.settings.viewAllCatalogs)
    const analystMode = useSelector((state: RootState) => state.settings.analystMode)
    const manuallySelectContext = useSelector((state: RootState) => state.settings.manuallyLimitContext)
    const origin = getParsedIframeInfo().origin
    const updateSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked
        dispatch(updateManualContextSelection(isChecked))
    }
    // Enable to limit catalog visibility
    // const visibleCatalogs = viewAllCatalogs ? availableCatalogs : availableCatalogs.filter((catalog: ContextCatalog) => !catalog.origin || catalog.origin === origin)
    const visibleCatalogs = availableCatalogs
    const defaultTableCatalog: ContextCatalog = {
        type: 'manual',
        name: DEFAULT_TABLES,
        id: 'default',
        content: {},
        allowWrite: true,
        origin,
        dbName: toolContext.dbInfo.name,
        dbId: toolContext.dbInfo.id || 0
    }
    
    useEffect(() => {
        refreshMemberships(currentUserId)
    }, [])

    const dbToCatalog = async () => {
        setIsCreatingDashboardToCatalog(true)
        const appState = await getApp().getState() as MetabaseAppStateDashboard

        getLLMResponse({
            'catalog': 'temp',
            'agent': "CreateDMFromDBoard",
            'agent_args': {
                'metabaseDashboard': appState
            }
        }, undefined, 'deepResearchTool').then(response => {
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
            const name = `${appState.id}-${appState.name}-${timestamp}`;
            const dbId = toolContext.dbId;
            const dbInfo = toolContext.dbInfo;
            const dashboardYaml = _.get(response, 'data.thread[0].content', {})
            const contents = JSON.stringify({
                content: dashboardYaml,
                dbName: dbInfo.name,
                dbId,
                dbDialect: dbInfo.dialect
            })
            const saveAndSelectCatalog = (catalogID: string) => {
                dispatch(saveCatalog({
                    type: 'aiGenerated',
                    id: catalogID,
                    name,
                    content: dashboardYaml,
                    dbName: dbInfo.name,
                    dbId: dbId || 0,
                    origin,
                    currentUserId
                }))
                dispatch(setSelectedCatalog(name))
                setIsCreatingDashboardToCatalog(false)
            }
            createCatalog({name, contents}).then(saveAndSelectCatalog)
        })
        .catch(err => {
            console.error('Error when generating model from dashboard', err)
            setIsCreatingDashboardToCatalog(false)
        })
    }
    const catalogContent = (
        <>
        <Box display="flex" alignItems="center" justifyContent="space-between">
            <Text fontSize="lg" fontWeight="bold">Available Catalogs</Text>
            
            <HStack spacing={0}>
            {
                isCreatingDashboardToCatalog ? 
              <Spinner size="xs" speed="0.8s" thickness="2px" color="blue.500" title="Running" mr={2}/>
              : 
              ""

            }
            {
                toolContext.pageType == 'dashboard' ? 
              <Button 
                size={"xs"} 
                onClick={dbToCatalog} 
                colorScheme="minusxGreen"
                isDisabled={isCreatingDashboardToCatalog || isCreatingCatalog}
                leftIcon={<BsMagic/>}
                mr={2}
              >
                DB to Catalog
              </Button> : ''
            }
            
            <Button 
              size={"xs"} 
              onClick={() => setIsCreatingCatalog(true)} 
              colorScheme="minusxGreen"
              isDisabled={isCreatingCatalog || isCreatingDashboardToCatalog}
              leftIcon={<BiBook />}
            >
              Create Catalog
            </Button>
            {!isInModal &&
            <IconButton
              aria-label="Open Modal"
                icon={<BiExpand />}
                size="xs"
                colorScheme="minusxGreen"
                onClick={modalOpen}
                ml={2}
            />}
            </HStack>
              
        </Box>
        <Text fontSize="xs" color={"minusxGreen.600"}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11165963-data-catalogs" isExternal>What are Catalogs and how to use them?</Link></Text>
        
        {isCreatingCatalog ? (
          <CatalogEditor onCancel={() => setIsCreatingCatalog(false)} />
        ) : (
          <>
            <Select size={"sm"} mt={2} colorScheme="minusxGreen" value={selectedCatalog} onChange={(e) => {dispatch(setSelectedCatalog(e.target.value))}}>
                {
                    [...visibleCatalogs, defaultTableCatalog].map((context: ContextCatalog) => {
                        return <option key={context.name} value={context.name}>{context.name}</option>
                    })
                }
            </Select>
            <Spacer height={2}/>
            {
                selectedCatalog === DEFAULT_TABLES ? <TablesCatalog /> : <YAMLCatalog />
            }
          </>
        )}
        </>
    )

    return (
        <Box position="relative">
            <Checkbox isChecked={manuallySelectContext} onChange={updateSelection}>Manually limit context</Checkbox>
            {catalogContent}
            {!manuallySelectContext && analystMode && (
                <Box
                    position="absolute"
                    top={0}
                    left={0}
                    width="100%"
                    height="100%"
                    bg="rgba(255, 255, 255, 0.5)"
                    backdropFilter="blur(4px)"
                    zIndex={1000}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Box
                        bg="white"
                        borderRadius="xl"
                        boxShadow="2xl"
                        p={8}
                        mx={6}
                        maxWidth="400px"
                        border="1px solid"
                        borderColor="gray.200"
                        transform="scale(1)"
                        transition="all 0.2s ease-in-out"
                        _hover={{
                            transform: 'scale(1.02)',
                            boxShadow: '3xl'
                        }}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                    >
                        <Box
                            width="60px"
                            height="60px"
                            borderRadius="full"
                            bg="minusxGreen.100"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            mb={4}
                        >
                            <BsRocketTakeoffFill size={24} color="white" />
                        </Box>
                        <Box
                            fontSize="md"
                            fontWeight="medium"
                            color="gray.700"
                            textAlign="center"
                            lineHeight="1.6"
                        >
                            In Analyst Mode, MinusX automatically figures out what matters with smart search and context awareness — no manual setup required! Like Claude Code, it just works.
                        </Box>
                        <br />
                        <Checkbox isChecked={manuallySelectContext} onChange={updateSelection}>Manually limit context</Checkbox>
                    </Box>
                </Box>
            )}
        </Box>
    )
}


export const Context: React.FC = () => {
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const tool = getParsedIframeInfo().tool
    const dbInfo = toolContext.dbInfo
    const { isOpen, onOpen: modalOpen, onClose: modalClose } = useDisclosure()
    if (tool != 'metabase') {
        return <Text>Coming soon!</Text>
    }
    if (isEmpty(toolContext)) {
        return <Text>Database context is empty</Text>
    }

    return <>
        <Text fontSize="2xl" fontWeight="bold">Context</Text>
        <Box mt={2} mb={2}>
            {/* <Text fontWeight="bold">DB Info</Text> */}
            <HStack justifyContent={"space-between"}>
            <Text fontSize="sm"><Text as="span">DB Name: <Badge color={"minusxGreen.600"}>{dbInfo.name}</Badge></Text></Text>
            <Text fontSize="sm"><Text as="span">SQL Dialect: </Text><Badge color={"minusxGreen.600"}>{dbInfo.dialect}</Badge></Text>    
            </HStack>
            {/* <Text fontSize="sm"><Text as="span">DB Description: {dbInfo.description || "-"}</Text></Text> */}
        </Box>
        <Spacer height={2}/>
        <CatalogDisplay isInModal={false} modalOpen={modalOpen}/>
        <Modal isOpen={isOpen} onClose={modalClose} size="3xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Context</ModalHeader>
                <ModalCloseButton />
                <ModalBody minH={"400px"} maxH={"650px"} overflowY={"auto"}>
                    <CatalogDisplay isInModal={true} modalOpen={modalOpen}/>
                </ModalBody>
            </ModalContent>
        </Modal>
    </>
}