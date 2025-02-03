import React from "react"
import { FilteredTable } from '../common/FilterableTable';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { Text, Box, Badge, Divider} from "@chakra-ui/react";


const useAppStore = getApp().useStore()

export const Context: React.FC<null> = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const tool = getParsedIframeInfo().tool
  if (tool != 'metabase' || isEmpty(toolContext)) {
    return <Text>Coming soon!</Text>
  }
  const relevantTables = toolContext.relevantTables
  const dbInfo = toolContext.dbInfo
  
  return <>
    <Text fontSize="lg" fontWeight="bold">Tables</Text>
    <Text color={"minusxBW.600"} fontSize="sm">These are the tables that MinusX has in context while answering queries. You can add/remove tables to control the context.</Text>

    <Box mt={2} mb={2}>
    <Text fontWeight="bold">DB Info</Text>
    <Text fontSize="sm"><Text as="span">{dbInfo.name}</Text></Text>
    <Text fontSize="sm"><Text as="span">{dbInfo.description}</Text></Text>
    <Text fontSize="sm"><Text as="span">SQL Dialect: </Text><Badge color={"minusxGreen.600"}>{dbInfo.dialect}</Badge></Text>
    </Box>
    
    <FilteredTable data={dbInfo?.tables || []} selectedData={relevantTables || []} searchKey={"name"} displayKeys={['name', 'description']}/>
  </>
}