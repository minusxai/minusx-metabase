import React, { useState } from "react"
import { Text, Box, Button, Input, Textarea, HStack} from "@chakra-ui/react";
import { saveCatalog } from "../../state/settings/reducer";
import { dispatch } from '../../state/dispatch';
import { load } from 'js-yaml';


interface CatalogEditorProps {
    onCancel: () => void;
    dbName: string;
    defaultTitle?: string;
    defaultContent?: string;
}

export const CatalogEditor: React.FC<CatalogEditorProps> = ({ onCancel, dbName, defaultTitle = '', defaultContent = '' }) => {
    const [title, setTitle] = useState(defaultTitle);
    const [yamlContent, setYamlContent] = useState(defaultContent);

    const handleSave = () => {
        dispatch(saveCatalog({ name: title, value: title.toLowerCase().replace(/\s/g, '_'), content: load(yamlContent), dbName: dbName }));
        onCancel();
    };

    return (
        <Box mt={4} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
        <Text fontSize="md" fontWeight="bold" mb={3}>{defaultTitle ? 'Edit Catalog' : 'Create New Catalog'}</Text>
        
        <Text fontSize="sm" mb={1}>Catalog Name</Text>
        <Input 
            placeholder="Enter catalog name" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            mb={4}
            size="sm"
            borderRadius="md"
            borderColor="gray.300"
        />
        
        <Text fontSize="sm" mb={1}>Catalog Definition (YAML)</Text>
        <Textarea
            placeholder="Enter YAML definition"
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            minHeight="200px"
            fontFamily="monospace"
            mb={4}
            size="sm"
            borderRadius="md"
            borderColor="gray.300"
        />
            
            <HStack spacing={4} justifyContent="flex-end">
                <Button size="sm" onClick={onCancel} variant="outline">Cancel</Button>
                <Button 
                    size="sm" 
                    colorScheme="minusxGreen" 
                    onClick={handleSave}
                    isDisabled={!title.trim() || !yamlContent.trim()}
                >
                    Save Catalog
                </Button>
            </HStack>
        </Box>
    );
};