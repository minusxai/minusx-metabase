import React from "react"
import { FilteredTable } from '../common/FilterableTable';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { Text, Box, Badge, Link} from "@chakra-ui/react";
import { applyTableDiff, TableInfo } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { applyTableDiffs } from "apps";

const useAppStore = getApp().useStore()

export const Context: React.FC<null> = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)

  const tool = getParsedIframeInfo().tool
  if (tool != 'metabase' || isEmpty(toolContext)) {
    return <Text>Coming soon!</Text>
  }
  const relevantTables = toolContext.relevantTables || []
  const dbInfo = toolContext.dbInfo
  const allTables = dbInfo?.tables || []

  const updatedRelevantTables = applyTableDiffs(relevantTables, allTables, tableDiff, dbInfo.id)
  
  const updateAddTables = (table: TableInfo) => {
    dispatch(applyTableDiff({
      actionType: 'add',
      table
    }))
  }

  const updateRemoveTables = (table: TableInfo) => {
    dispatch(applyTableDiff({
      actionType: 'remove',
      table
    }))
  }
  
  return <>
    <Text fontSize="lg" fontWeight="bold">Tables</Text>
    <Text color={"minusxBW.600"} fontSize="sm">The selected tables are in MinusX context while answering queries. You can select/unselect tables to control the context.</Text>
    <Text fontSize="sm" color={"minusxGreen.600"} mt={1}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/10501728-modify-relevant-tables-list" isExternal>Read more about table context.</Link></Text>

    <Box mt={2} mb={2}>
    <Text fontWeight="bold">DB Info</Text>
    <Text fontSize="sm"><Text as="span">DB Name: <Badge color={"minusxGreen.600"}>{dbInfo.name}</Badge></Text></Text>
    <Text fontSize="sm"><Text as="span">DB Description: {dbInfo.description || "-"}</Text></Text>
    <Text fontSize="sm"><Text as="span">SQL Dialect: </Text><Badge color={"minusxGreen.600"}>{dbInfo.dialect}</Badge></Text>
    </Box>
    <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"} mt={2}>{updatedRelevantTables.length} out of {allTables.length} tables selected</Text>
    <FilteredTable dbId={dbInfo.id} data={allTables} selectedData={updatedRelevantTables} addFn={updateAddTables} removeFn={updateRemoveTables}/>
  </>
}