import React, { useState } from "react"
import { Text, Box, Button, Input, Textarea, HStack} from "@chakra-ui/react";
import { saveCatalog, setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch } from '../../state/dispatch';
import { load } from 'js-yaml';
import { MetabaseContext } from "apps/types";
import { getApp } from "../../helpers/app";

const useAppStore = getApp().useStore()

interface CatalogEditorProps {
    onCancel: () => void;
    defaultTitle?: string;
    defaultContent?: string;
}

const createCatalog = async ({ name, content }: { name: string; content: string }) => {
    console.log('Creating catalog', name, content)
}

const updateCatalog = async ({ name, content }: { name: string; content: string }) => {
    console.log('Updating catalog', name, content)
}

export const CatalogEditor: React.FC<CatalogEditorProps> = ({ onCancel, defaultTitle = '', defaultContent = '' }) => {
    const [title, setTitle] = useState(defaultTitle);
    const [yamlContent, setYamlContent] = useState(defaultContent);
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const dbName = toolContext.dbInfo.name
    const dbId = toolContext.dbInfo.id
    const dbDialect = toolContext.dbInfo.dialect

    const handleSave = async () => {
        const fn = defaultTitle ? updateCatalog : createCatalog
        fn({
            name: title,
            content: JSON.stringify({
                content: yamlContent,
                dbName: dbName,
                dbId: dbId,
                dbDialect: dbDialect
            })
        })
        dispatch(saveCatalog({ name: title, value: title.toLowerCase().replace(/\s/g, '_'), content: load(yamlContent), dbName: dbName }));
        onCancel();
        dispatch(setSelectedCatalog(title.toLowerCase().replace(/\s/g, '_')))
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