import React, { useState } from "react"
import { TablesCatalog } from '../common/TablesCatalog';
import { CatalogEditor } from '../common/CatalogEditor';
import { YAMLCatalog } from '../common/YAMLCatalog';
import { getApp } from '../../helpers/app';
import { Text, Badge, Select, Spacer, Box, Button} from "@chakra-ui/react";
import { setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { MetabaseContext } from 'apps/types';
import { BiBook } from "react-icons/bi";



const useAppStore = getApp().useStore()


export const Context: React.FC = () => {
    const [isCreatingCatalog, setIsCreatingCatalog] = useState(false);
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog)
    const availableCatalogs = useSelector((state: RootState) => state.settings.availableCatalogs)
    const defaultTableCatalog = useSelector((state: RootState) => state.settings.defaultTableCatalog)
    
    const tool = getParsedIframeInfo().tool
    if (tool != 'metabase' || isEmpty(toolContext)) {
      return <Text>Coming soon!</Text>
    }
    const dbInfo = toolContext.dbInfo

    return <>
        <Text fontSize="lg" fontWeight="bold">Context</Text>
        <Box mt={2} mb={2}>
            <Text fontWeight="bold">DB Info</Text>
            <Text fontSize="sm"><Text as="span">DB Name: <Badge color={"minusxGreen.600"}>{dbInfo.name}</Badge></Text></Text>
            <Text fontSize="sm"><Text as="span">DB Description: {dbInfo.description || "-"}</Text></Text>
            <Text fontSize="sm"><Text as="span">SQL Dialect: </Text><Badge color={"minusxGreen.600"}>{dbInfo.dialect}</Badge></Text>
        </Box>
            
        <Spacer height={5}/>
        <Box display="flex" alignItems="center" justifyContent="space-between">
            <Text fontSize="md" fontWeight="bold">Available Catalogs</Text>
            <Button 
              size={"xs"} 
              onClick={() => setIsCreatingCatalog(true)} 
              colorScheme="minusxGreen"
              isDisabled={isCreatingCatalog}
              leftIcon={<BiBook />}
            >
              Create Catalog
            </Button>
        </Box>
        
        {isCreatingCatalog ? (
          <CatalogEditor onCancel={() => setIsCreatingCatalog(false)} dbName={dbInfo.name}/>
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
                selectedCatalog !== "" ? (
                    selectedCatalog === "tables" ? <TablesCatalog /> : <YAMLCatalog />
                ) : (
                    <Text fontSize="sm" color="gray.500">No catalog selected</Text>
                )
            }
          </>
        )}
    </>
}