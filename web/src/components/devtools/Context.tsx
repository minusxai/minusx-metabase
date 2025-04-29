import React, { useEffect, useState } from "react"
import { TablesCatalog } from '../common/TablesCatalog';
import { CatalogEditor } from '../common/CatalogEditor';
import { refreshMemberships, YAMLCatalog } from '../common/YAMLCatalog';
import { getApp } from '../../helpers/app';
import { Text, Badge, Select, Spacer, Box, Button, HStack, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, useDisclosure, IconButton, Link} from "@chakra-ui/react";
import { setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { MetabaseContext } from 'apps/types';
import { BiBook, BiExpand } from "react-icons/bi";



const useAppStore = getApp().useStore()

const CatalogDisplay = ({isInModal, modalOpen}: {isInModal: boolean, modalOpen: () => void}) => {
    const [isCreatingCatalog, setIsCreatingCatalog] = useState(false);
    const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog)
    const availableCatalogs = useSelector((state: RootState) => state.settings.availableCatalogs)
    const selectedCatalogIsValid = availableCatalogs.some((catalog) => catalog.value === selectedCatalog) || selectedCatalog === "tables"
    const defaultTableCatalog = useSelector((state: RootState) => state.settings.defaultTableCatalog)
    const currentUserId = useSelector((state: RootState) => state.auth.profile_id)

    useEffect(() => {
        refreshMemberships(currentUserId)
    }, [])

    return (
        <>
        <Box display="flex" alignItems="center" justifyContent="space-between">
            <Text fontSize="lg" fontWeight="bold">Available Catalogs</Text>
            
            <HStack spacing={0}>
            <Button 
              size={"xs"} 
              onClick={() => setIsCreatingCatalog(true)} 
              colorScheme="minusxGreen"
              isDisabled={isCreatingCatalog}
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
            <Select placeholder="Select a catalog" mt={2} colorScheme="minusxGreen" value={selectedCatalog} onChange={(e) => {dispatch(setSelectedCatalog(e.target.value))}}>
                {
                    [...availableCatalogs, defaultTableCatalog].map((context: any) => {
                        return <option key={context.value} value={context.value}>{context.name}</option>
                    })
                }
            </Select>
            <Spacer height={5}/>
            {
                selectedCatalogIsValid ? (
                    selectedCatalog === "tables" ? <TablesCatalog /> : <YAMLCatalog />
                ) : (
                    <Text fontSize="sm" color="gray.500">No catalog selected</Text>
                )
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
    if (tool != 'metabase' || isEmpty(toolContext)) {
      return <Text>Coming soon!</Text>
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