import React, { useEffect, useState } from "react"
import { Text, Link, HStack, VStack, Button, Box, Tabs, TabList, TabPanels, TabPanel, Tab } from "@chakra-ui/react";
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { CodeBlock } from './CodeBlock';
import { CatalogEditor, makeCatalogAPICall } from './CatalogEditor';
import { BiPencil, BiTrash } from "react-icons/bi";
import { dump } from 'js-yaml';
import { deleteCatalog, setMemberships, UserGroup, UserInfo } from "../../state/settings/reducer";
import { ContextCatalog } from '../../helpers/utils';
import { dispatch } from '../../state/dispatch';
import { configs } from "../../constants";
import { get } from "lodash";
import { ModelView } from "./ModelView";

interface Asset {
  id: string;
  name: string;
  contents: string;
  type: string
  owner: string
  created_at: string
  updated_at: string
}

export const refreshMemberships = async (currentUserId: string) => {
  const { assets, groups, members }: {assets: Asset[], groups: UserGroup[], members: UserInfo[] } = await makeCatalogAPICall(
    'all_memberships', {}, configs.GROUPS_BASE_URL
  )
  dispatch(setMemberships({ assets, groups, members, currentUserId }))
}

const deleteCatalogRemote = async (catalogId: string) => {
  await makeCatalogAPICall('delete', { id: catalogId, type: 'catalog' })
}

export const YAMLCatalog: React.FC<null> = () => {
  const [isEditing, setIsEditing] = useState(false);
  const availableCatalogs: ContextCatalog[] = useSelector((state: RootState) => state.settings.availableCatalogs);
  const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog);
//   const [isModelView, setIsModelView] = useState(false);
  
  const currentCatalog = availableCatalogs.find(catalog => catalog.name === selectedCatalog);
  const yamlContent = dump(currentCatalog?.content || {});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteCatalogRemote(currentCatalog?.id || '');
    setIsDeleting(false);
    dispatch(deleteCatalog(currentCatalog?.name || ''));
  }
  const allowWrite = get(currentCatalog, 'allowWrite', true)

  return (
    <VStack w="100%" align="stretch" spacing={1}>
      <HStack w={"100%"} justify={"space-between"}>
        {isDeleting && (
          <Text fontSize="md" fontWeight="bold">Deleting...</Text>
        )}
        <VStack textAlign={"left"} alignItems={"flex-start"} justifyContent={"flex-start"} gap={0} m={0} p={0}>
          <Text fontSize="md" fontWeight="bold">Catalog: {currentCatalog?.name || 'None selected'}</Text>
          <Text fontSize="xs" color={"minusxGreen.600"}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11166107-advanced-catalogs" isExternal>How to create a catalog?</Link></Text>
          {/* <Button size="xs" variant="link" onClick={() => setIsModelView(!isModelView)}>
              {isModelView ? 'Catalog View' : 'Model View'}
          </Button> */}
        </VStack>
        {!isEditing && (
            <HStack spacing={2}>
          <Button 
            size="xs"
            colorScheme="minusxGreen" 
            onClick={handleEditClick}
            isDisabled={isDeleting || !allowWrite}
            leftIcon={<BiPencil />}
          >
            Edit
          </Button>
          <Button 
            size="xs" 
            colorScheme="minusxGreen" 
            onClick={handleDelete}
            isDisabled={isDeleting || !allowWrite}
            leftIcon={<BiTrash />}
          >
            Delete
          </Button>
          

          </HStack>
        )}
      </HStack>
      
        <Tabs isFitted variant='enclosed-colored' colorScheme="minusxGreen" mt={5}>
            <TabList mb='1em'>
                <Tab><VStack gap={0} p={0} m={0}><Text>Catalog</Text><Text fontSize={"xs"} m={"-5px"}>[user editable]</Text></VStack></Tab>
                <Tab><VStack gap={0} p={0} m={0}><Text>Preview</Text><Text fontSize={"xs"} m={"-5px"}>[what MinusX sees]</Text></VStack></Tab>
            </TabList>
            <TabPanels>
                <TabPanel pt={0}>
                    {isEditing ? (
                        <CatalogEditor 
                        onCancel={handleCancelEdit} 
                        id={currentCatalog?.id || ''}
                        />
                    ) : (
                        <Box w="100%">
                            <CodeBlock 
                            code={yamlContent} 
                            tool="" 
                            language="yaml" 
                            />
                        </Box>
                    )}
                </TabPanel>
                <TabPanel pt={0}>
                    <ModelView yamlContent={yamlContent} />
                </TabPanel>
            </TabPanels>
        </Tabs>
    </VStack>
  );
}
