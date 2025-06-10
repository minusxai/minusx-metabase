import React, { useState } from "react"
import { Text, Box, Button, Input, Textarea, HStack, Link} from "@chakra-ui/react";
import { saveCatalog, setSelectedCatalog } from "../../state/settings/reducer";
import { ContextCatalog } from '../../helpers/utils';
import { dispatch } from '../../state/dispatch';
import { load, dump } from 'js-yaml';
import { MetabaseContext } from "apps/types";
import { getApp } from "../../helpers/app";
import axios, { isAxiosError } from "axios";
import { configs } from "../../constants";
import { useSelector } from "react-redux";
import { RootState } from "../../state/store";
import { toast } from "../../app/toast";
import { getParsedIframeInfo } from "../../helpers/origin";
import { CodeEditor } from "./YAMLEditor";

const schema_uri = `${configs.BASE_SERVER_URL}/deepresearch/json_schema`

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

export const createCatalog = async ({ name, contents }: { name: string; contents: string }) => {
    const {id}: {id: string} = await makeCatalogAPICall('', {name, contents, type: 'catalog'})
    return id
}

export const updateCatalog = async ({ id, name, contents }: { id: string; name: string; contents: string }) => {
    const {id: newId}: {id: string} = await makeCatalogAPICall('', {name, contents, type: 'catalog', id})
    return newId
}

export const CatalogEditor: React.FC<CatalogEditorProps> = ({ onCancel, defaultTitle = '', defaultContent = '', id = '' }) => {
    const catalog: ContextCatalog | undefined = useSelector((state: RootState) => state.settings.availableCatalogs.find(catalog => catalog.id === id))
    const origin = getParsedIframeInfo().origin
    
    if (catalog) {
        defaultTitle = catalog.name
        defaultContent = catalog.content
    }
    if (typeof defaultContent !== 'string') {
        defaultContent = dump(defaultContent)
    }

    if (defaultContent === '') {
        defaultContent = `entities:
  - name: <EntityName>
    description: <EntityDescription>
    sql_table: <Schema.TableName> # optional; one of sql_table or sql must be defined
    sql: <SQL CTE> # optional; one of sql_table or sql must be defined
    dimensions:
      - name: <DimensionName>
        type: <DimensionType>
        description: <DimensionDescription>
        sql: <SQL>
        unique: <true/false>
    metrics:
      - name: <MetricName>
        description: <MetricDescription>
        sql: <SQL>
    examples: # optional; examples of queries using this entity
      - name: <ExampleName>
        description: <ExampleDescription>
        sql: <SQL. This SQL should refer the entity name and not the base table name>`
    }
    
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState(defaultTitle);
    const [yamlContent, setYamlContent] = useState(defaultContent);
    const [hasValidationErrors, setHasValidationErrors] = useState(false);
    
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
                        dbName,
                        dbId: dbId,
                        dbDialect: dbDialect,
                        origin
                    })
                })
                setIsSaving(false);
                dispatch(saveCatalog({ type: 'manual', id: catalogID, name: title, content, dbName, dbId, origin, currentUserId }));
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
            console.error('Error saving catalog:', err);
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
            <HStack justifyContent="space-between" mb={4}>
                <Text fontSize="md" fontWeight="bold">{defaultTitle ? 'Edit Catalog' : 'Create New Catalog'}</Text>
                <HStack spacing={4} justifyContent="flex-end">
                    <Button size="xs" onClick={onCancel} variant="outline">Cancel</Button>
                    <Button 
                        size="xs" 
                        colorScheme="minusxGreen" 
                        onClick={handleSave}
                        isDisabled={!title.trim() || !yamlContent.trim() || isSaving || hasValidationErrors}
                    >
                        Save Catalog
                    </Button>
                </HStack>
            </HStack>
            
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
            
            <CodeEditor
                height="400px"
                language="yaml"
                value={yamlContent}
                onChange={(value) => setYamlContent(value || '')}
                onValidation={(error) => setHasValidationErrors(error)}
                schemaUri={schema_uri} // Pass the schema URI to the component
            />
        </Box>
    );
};