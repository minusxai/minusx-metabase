import React, { useEffect, useState } from "react"
import { Text, Link, HStack, VStack, Button, Box } from "@chakra-ui/react";
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { CodeBlock } from './CodeBlock';
import { CatalogEditor, makeCatalogAPICall } from './CatalogEditor';
import { BiPencil, BiTrash } from "react-icons/bi";
import { dump } from 'js-yaml';
import { ContextCatalog, deleteCatalog, setMemberships, UserGroup, UserInfo } from "../../state/settings/reducer";
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
  const [isModelView, setIsModelView] = useState(false);
  
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
        <HStack>
          <Text fontSize="md" fontWeight="bold">Catalog: {currentCatalog?.name || 'None selected'}</Text>        
          <Button size="xs" variant="link" onClick={() => setIsModelView(!isModelView)}>
              {isModelView ? 'Catalog View' : 'Model View'}
          </Button>
        </HStack>
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
      <Text fontSize="xs" color={"minusxGreen.600"}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11166107-advanced-catalogs" isExternal>How to create a catalog?</Link></Text>
      
      {isEditing ? (
        <CatalogEditor 
          onCancel={handleCancelEdit} 
          id={currentCatalog?.id || ''}
        />
      ) : isModelView ? (
        <ModelView
          yamlContent={yamlContent}
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
    </VStack>
  );
}
