import React from "react"
import { TablesCatalog } from '../common/TablesCatalog';
import { getApp } from '../../helpers/app';
import { Text, Badge, Select, Spacer, Box} from "@chakra-ui/react";
import { setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { MetabaseContext } from 'apps/types';



const useAppStore = getApp().useStore()



export const Context: React.FC<null> = () => {
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)
    const selectedCatalog = useSelector((state: RootState) => state.settings.selectedCatalog)
    const availableCatalogs = useSelector((state: RootState) => state.settings.availableCatalogs)
    
    const tool = getParsedIframeInfo().tool
    if (tool != 'metabase' || isEmpty(toolContext)) {
    return <Text>Coming soon!</Text>
    }
    const relevantTables = toolContext.relevantTables || []
    const dbInfo = toolContext.dbInfo
    const allTables = dbInfo?.tables || []
    
      
    return <>
        <Text fontSize="lg" fontWeight="bold">Context</Text>
        <Box mt={2} mb={2}>
            <Text fontWeight="bold">DB Info</Text>
            <Text fontSize="sm"><Text as="span">DB Name: <Badge color={"minusxGreen.600"}>{dbInfo.name}</Badge></Text></Text>
            <Text fontSize="sm"><Text as="span">DB Description: {dbInfo.description || "-"}</Text></Text>
            <Text fontSize="sm"><Text as="span">SQL Dialect: </Text><Badge color={"minusxGreen.600"}>{dbInfo.dialect}</Badge></Text>
        </Box>
            
        <Spacer height={5}/>
        <Text fontSize="md" fontWeight="bold">Available Catalogs</Text>
        <Select placeholder="Select a catalog" mt={2} colorScheme="minusxGreen" value={selectedCatalog} onChange={(e) => {dispatch(setSelectedCatalog(e.target.value))}}>
            {
                availableCatalogs.map((context: any) => {
                    return <option key={context.value} value={context.value}>{context.name}</option>
                })
            }
        </Select>
        <Spacer height={5}/>
        {
            selectedCatalog === "tables" && <TablesCatalog />
        }
    </>
}