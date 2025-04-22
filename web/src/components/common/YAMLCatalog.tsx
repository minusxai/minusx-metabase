import React, { useEffect, useState } from "react"
import { Text, Link, HStack, VStack, Button, Box } from "@chakra-ui/react";
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { CodeBlock } from './CodeBlock';
import { CatalogEditor, makeCatalogAPICall } from './CatalogEditor';
import { BiPencil, BiTrash } from "react-icons/bi";
import { dump } from 'js-yaml';
import { ContextCatalog, deleteCatalog, setCatalogs } from "../../state/settings/reducer";
import { dispatch } from '../../state/dispatch';

interface Asset {
  id: string;
  name: string;
  contents: string;
}

export const refreshCatalogs = async () => {
  const { assets }: {assets: Asset[]} = await makeCatalogAPICall('retrieve', { type: 'catalog' })
  const catalogs: ContextCatalog[] = []
  for (const asset of assets) {
    const {content, dbName} : {content: string, dbName: string} = JSON.parse(asset.contents)
    catalogs.push({
      id: asset.id,
      name: asset.name,
      value: asset.name,
      content: content,
      dbName: dbName,
    })
  }
  dispatch(setCatalogs(catalogs))
}

const deleteCatalogRemote = async (catalogId: string) => {
  await makeCatalogAPICall('delete', { id: catalogId, type: 'catalog' })
}

export const YAMLCatalog: React.FC<null> = () => {
  const [isEditing, setIsEditing] = useState(false);
  const availableCatalogs = useSelector((state: RootState) => state.settings.availableCatalogs);
  const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog);
  
  const currentCatalog = availableCatalogs.find(catalog => catalog.value === selectedCatalog);
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
    dispatch(deleteCatalog(currentCatalog?.value || ''));
  }

  return (
    <VStack w="100%" align="stretch" spacing={4}>
      <HStack w={"100%"} justify={"space-between"}>
        {isDeleting && (
          <Text fontSize="md" fontWeight="bold">Deleting...</Text>
        )}
        <Text fontSize="md" fontWeight="bold">Catalog: {currentCatalog?.name || 'None selected'}</Text>
        {!isEditing && (
            <HStack spacing={2}>
          <Button 
            size="xs" 
            colorScheme="minusxGreen" 
            onClick={handleEditClick}
            isDisabled={isDeleting}
            leftIcon={<BiPencil />}
          >
            Edit
          </Button>
          <Button 
            size="xs" 
            colorScheme="minusxGreen" 
            onClick={handleDelete}
            isDisabled={isDeleting}
            leftIcon={<BiTrash />}
          >
            Delete
          </Button>
          

          </HStack>
        )}
      </HStack>
      
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
    </VStack>
  );
}
