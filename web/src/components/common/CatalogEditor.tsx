import React, { useState } from "react"
import { Text, Box, Button, Input, Textarea, HStack} from "@chakra-ui/react";
import { saveCatalog, setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch } from '../../state/dispatch';
import { load } from 'js-yaml';
import { MetabaseContext } from "apps/types";
import { getApp } from "../../helpers/app";
import axios from "axios";
import { configs } from "../../constants";

const useAppStore = getApp().useStore()

interface CatalogEditorProps {
    onCancel: () => void;
    defaultTitle?: string;
    defaultContent?: string;
    id?: string
}

const makeCatalogAPICall = async (endpoint: string, data: { name: string; contents: string, type: string, id?: string }) => {
    const url = `${configs.ASSETS_BASE_URL}/${endpoint}`
    const response = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.data;
}

const createCatalog = async ({ name, contents }: { name: string; contents: string }) => {
    const {id}: {id: string} = await makeCatalogAPICall('', {name, contents, type: 'catalog'})
    return id
}

const updateCatalog = async ({ id, name, contents }: { id: string; name: string; contents: string }) => {
    const {id: newId}: {id: string} = await makeCatalogAPICall('', {name, contents, type: 'catalog', id})
    return newId
}

export const CatalogEditor: React.FC<CatalogEditorProps> = ({ onCancel, defaultTitle = '', defaultContent = '', id = '' }) => {
    const [title, setTitle] = useState(defaultTitle);
    const [yamlContent, setYamlContent] = useState(defaultContent);
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const dbName = toolContext.dbInfo.name
    const dbId = toolContext.dbInfo.id
    const dbDialect = toolContext.dbInfo.dialect

    const handleSave = async () => {
        const fn = defaultTitle ? updateCatalog : createCatalog
        const catalogID = await fn({
            id,
            name: title,
            contents: JSON.stringify({
                content: yamlContent,
                dbName: dbName,
                dbId: dbId,
                dbDialect: dbDialect
            })
        })
        dispatch(saveCatalog({ id: catalogID, name: title, value: title.toLowerCase().replace(/\s/g, '_'), content: load(yamlContent), dbName: dbName }));
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