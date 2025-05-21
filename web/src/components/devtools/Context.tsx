import React, { useEffect, useState } from "react"
import { TablesCatalog } from '../common/TablesCatalog';
import { CatalogEditor, createCatalog } from '../common/CatalogEditor';
import { refreshMemberships, YAMLCatalog } from '../common/YAMLCatalog';
import { getApp } from '../../helpers/app';
import { Text, Badge, Select, Spacer, Box, Button, HStack, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, useDisclosure, IconButton, Link, Spinner} from "@chakra-ui/react";
import { ContextCatalog, DEFAULT_TABLES, setSelectedCatalog, saveCatalog } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty, set } from 'lodash';
import { MetabaseContext } from 'apps/types';
import { BiBook, BiExpand } from "react-icons/bi";
import { BsMagic } from "react-icons/bs";
import { MetabaseAppStateDashboard } from "../../../../apps/src/metabase/helpers/DOMToState";
import { getLLMResponse } from "../../app/api";
import _ from 'lodash';



const useAppStore = getApp().useStore()

const CatalogDisplay = ({isInModal, modalOpen}: {isInModal: boolean, modalOpen: () => void}) => {
    const [isCreatingCatalog, setIsCreatingCatalog] = useState(false);
    const [isCreatingDashboardToCatalog, setIsCreatingDashboardToCatalog] = useState(false);
    const selectedCatalog: string = useSelector((state: RootState) => state.settings.selectedCatalog)
    const availableCatalogs: ContextCatalog[] = useSelector((state: RootState) => state.settings.availableCatalogs)
    const defaultTableCatalog = useSelector((state: RootState) => state.settings.defaultTableCatalog)
    const currentUserId = useSelector((state: RootState) => state.auth.profile_id)
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const viewAllCatalogs = useSelector((state: RootState) => state.settings.viewAllCatalogs)
    const origin = getParsedIframeInfo().origin
    // Enable to limit catalog visibility
    // const visibleCatalogs = viewAllCatalogs ? availableCatalogs : availableCatalogs.filter((catalog: ContextCatalog) => !catalog.origin || catalog.origin === origin)
    const visibleCatalogs = availableCatalogs
    
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

    return (
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
            <Select mt={2} colorScheme="minusxGreen" value={selectedCatalog} onChange={(e) => {dispatch(setSelectedCatalog(e.target.value))}}>
                {
                    [...visibleCatalogs, defaultTableCatalog].map((context: ContextCatalog) => {
                        return <option key={context.name} value={context.name}>{context.name}</option>
                    })
                }
            </Select>
            <Spacer height={5}/>
            {
                selectedCatalog === DEFAULT_TABLES ? <TablesCatalog /> : <YAMLCatalog />
            }
          </>
        )}
        </>
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
            <Text fontSize="sm"><Text as="span">DB Description: {dbInfo.description || "-"}</Text></Text>
        </Box>
        <Spacer height={5}/>
        <CatalogDisplay isInModal={false} modalOpen={modalOpen}/>
        <Modal isOpen={isOpen} onClose={modalClose} size="3xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Catalogs</ModalHeader>
                <ModalCloseButton />
                <ModalBody minH={"400px"} maxH={"600px"} overflowY={"auto"}>
                    <CatalogDisplay isInModal={true} modalOpen={modalOpen}/>
                </ModalBody>
            </ModalContent>
        </Modal>
    </>
}