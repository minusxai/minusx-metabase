import React, { useState } from "react"
import { Text, Link, HStack, VStack, Button, Box } from "@chakra-ui/react";
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { CodeBlock } from './CodeBlock';
import { CatalogEditor } from './CatalogEditor';
import { BiPencil, BiTrash } from "react-icons/bi";
import { dump } from 'js-yaml';
import { deleteCatalog } from "../../state/settings/reducer";
import { dispatch } from '../../state/dispatch';


export const YAMLCatalog: React.FC<null> = () => {
  const [isEditing, setIsEditing] = useState(false);
  const availableCatalogs = useSelector((state: RootState) => state.settings.availableCatalogs);
  const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog);
  
  const currentCatalog = availableCatalogs.find(catalog => catalog.value === selectedCatalog);
  const yamlContent = dump(currentCatalog?.content || {});

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    dispatch(deleteCatalog(currentCatalog?.value || ''));
  }

  return (
    <VStack w="100%" align="stretch" spacing={4}>
      <HStack w={"100%"} justify={"space-between"}>
        <Text fontSize="md" fontWeight="bold">Catalog: {currentCatalog?.name || 'None selected'}</Text>
        {!isEditing && (
            <HStack spacing={2}>
          <Button 
            size="xs" 
            colorScheme="minusxGreen" 
            onClick={handleEditClick}
            leftIcon={<BiPencil />}
          >
            Edit
          </Button>
          <Button 
            size="xs" 
            colorScheme="minusxGreen" 
            onClick={handleDelete}
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
          defaultTitle={currentCatalog?.name || ''}
          defaultContent={yamlContent}
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
