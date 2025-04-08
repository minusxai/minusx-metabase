import React from "react"
import { FilteredTable } from './FilterableTable';
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { Text, Link, HStack} from "@chakra-ui/react";
import { applyTableDiff, TableInfo, setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { applyTableDiffs } from "apps";

const useAppStore = getApp().useStore()


export const TablesCatalog: React.FC<null> = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)

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
    <HStack w={"100%"} justify={"space-between"}><Text fontSize="md" fontWeight="bold">Default Tables</Text><Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"}>[{updatedRelevantTables.length} out of {allTables.length} tables selected]</Text></HStack>
    <Text color={"minusxBW.600"} fontSize="sm">The selected tables are in MinusX context while answering queries. You can select/unselect tables to control the context.</Text>
    <Text fontSize="sm" color={"minusxGreen.600"} mt={1}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/10501728-modify-relevant-tables-list" isExternal>Read more about table context.</Link></Text>
    <FilteredTable dbId={dbInfo.id} data={allTables} selectedData={updatedRelevantTables} addFn={updateAddTables} removeFn={updateRemoveTables}/>
  </>
}
