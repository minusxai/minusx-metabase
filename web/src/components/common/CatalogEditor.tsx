import React, { useState } from "react"
import { Text, Box, Button, Input, Textarea, HStack, Link} from "@chakra-ui/react";
import { ContextCatalog, saveCatalog, setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch } from '../../state/dispatch';
import { load, dump } from 'js-yaml';
import { MetabaseContext } from "apps/types";
import { getApp } from "../../helpers/app";
import axios, { isAxiosError } from "axios";
import { configs } from "../../constants";
import { useSelector } from "react-redux";
import { RootState } from "../../state/store";
import { toast } from "../../app/toast";

const useAppStore = getApp().useStore()

interface CatalogEditorProps {
    onCancel: () => void;
    defaultTitle?: string;
    defaultContent?: string;
    id?: string
}

export const makeCatalogAPICall = async (endpoint: string, data: object, baseURL?: string) => {
    baseURL = baseURL || configs.ASSETS_BASE_URL
    const url = `${baseURL}/${endpoint}`
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
    const catalog: ContextCatalog = useSelector((state: RootState) => state.settings.availableCatalogs.find(catalog => catalog.id === id))
    if (catalog) {
        defaultTitle = catalog.name
        defaultContent = catalog.content
    }
    if (typeof defaultContent !== 'string') {
        defaultContent = dump(defaultContent)
    }
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState(defaultTitle);
    const [yamlContent, setYamlContent] = useState(defaultContent);
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const currentUserId = useSelector((state: RootState) => state.auth.profile_id)
    const dbName = toolContext.dbInfo.name
    const dbId = toolContext.dbInfo.id
    const dbDialect = toolContext.dbInfo.dialect

    const handleSave = async () => {
        const anyChange = yamlContent !== defaultContent || title !== defaultTitle
        try {
            if (anyChange) {
                const fn = defaultTitle ? updateCatalog : createCatalog
                setIsSaving(true);
                const content = load(yamlContent)
                const catalogID = await fn({
                    id,
                    name: title,
                    contents: JSON.stringify({
                        content,
                        dbName: dbName,
                        dbId: dbId,
                        dbDialect: dbDialect
                    })
                })
                setIsSaving(false);
                dispatch(saveCatalog({ id: catalogID, name: title, content, dbName: dbName, currentUserId }));
            }
            dispatch(setSelectedCatalog(title))
        } catch(err) {
            let description = "There was an error saving the catalog. Please try again."
            if (isAxiosError(err)) {
                description = err.response?.data?.error || err.message
            } else if (err instanceof Error) {
                description = err.message
            }
            toast({
                title: "Error saving catalog",
                description,
                status: "error",
                duration: 5000,
                isClosable: true,
                position: 'bottom-right',
            })
            console.error('Error saving catalog:', e);
        } finally {
            setIsSaving(false);
            onCancel();
        } 
    };

    return (
        <Box mt={4} border="1px" borderColor="gray.200" borderRadius="md" p={4}>
            {isSaving && (
                <Text fontSize="sm" color="green.500" mb={2}>Saving...</Text>
            )}
        <Text fontSize="md" fontWeight="bold">{defaultTitle ? 'Edit Catalog' : 'Create New Catalog'}</Text>
        <Text fontSize="xs" color={"minusxGreen.600"} mb={3}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11166107-advanced-catalogs" isExternal>How to create a catalog?</Link></Text>
        
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
                    isDisabled={!title.trim() || !yamlContent.trim() || isSaving}
                >
                    Save Catalog
                </Button>
            </HStack>
        </Box>
    );
};