import React, { useEffect } from "react"
import { FilteredTable } from './FilterableTable';
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { Text, Link, HStack, Button} from "@chakra-ui/react";
import { applyTableDiff, TableInfo, setSelectedCatalog, resetDefaultTablesDB } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { applyTableDiffs } from "apps";
import { isEmpty, sortBy } from "lodash";
import { BiSolidMagicWand } from "react-icons/bi";

const useAppStore = getApp().useStore()

export const NUM_RELEVANT_TABLES = 15

const updateAddTables = (tables: TableInfo[]) => {
  dispatch(applyTableDiff({
    actionType: 'add',
    tables
  }))
}
const updateRemoveTables = (tables: TableInfo[]) => {
  dispatch(applyTableDiff({
    actionType: 'remove',
    tables
  }))
}

export const resetRelevantTables = (relevantTables: TableInfo[], dbId: number) => {
  dispatch(resetDefaultTablesDB({
    dbId
  }))
  updateAddTables(relevantTables.slice(0, NUM_RELEVANT_TABLES).map((table) => ({
    name: table.name,
    schema: table.schema,
    dbId: dbId
  })))
}

export const TablesCatalog: React.FC<null> = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)

  const relevantTables = toolContext.relevantTables || []
  const dbInfo = toolContext.dbInfo
  const allTables = dbInfo.tables || []

  const validAddedTables = applyTableDiffs('', allTables, tableDiff, dbInfo.id)

  const isAnyTablesAdded = () => {
    const addedTables = sortBy(tableDiff.add.filter((item: TableInfo) => item.dbId == dbInfo.id), ['name', 'schema'])
    const topRelevantTables = sortBy(relevantTables.slice(0, NUM_RELEVANT_TABLES), ['name', 'schema'])
    if (addedTables.length !== topRelevantTables.length) {
      return true
    }
    for (let i = 0; i < addedTables.length; i++) {
      if (addedTables[i].name !== topRelevantTables[i].name || addedTables[i].schema !== topRelevantTables[i].schema) {
        return true
      }
    }
    return false
  }

  const isAnyChange = isAnyTablesAdded()

  const _resetRelevantTables = () => {
    const relevantTablesInfo = relevantTables.map(table => ({
      name: table.name,
      schema: table.schema,
      dbId: dbInfo.id
    }))
    resetRelevantTables(relevantTablesInfo, dbInfo.id)
  }

  return <>
    <HStack w={"100%"} justify={"space-between"}>
        <Text fontSize="md" fontWeight="bold">Catalog: Default Tables</Text>
        <Button 
            size={"xs"} 
            onClick={_resetRelevantTables} 
            colorScheme="minusxGreen"
            isDisabled={!isAnyChange}
            leftIcon={<BiSolidMagicWand />}
        >
            Reset to Smart Defaults
        </Button>
        {/* <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"}>[{validAddedTables.length} out of {allTables.length} tables selected]</Text> */}
    </HStack>
    <Text fontSize="xs" color={"minusxGreen.600"}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11166007-default-tables" isExternal>What are Default Tables?</Link></Text>
    <FilteredTable dbId={dbInfo.id} data={allTables} selectedData={validAddedTables} addFn={updateAddTables} removeFn={updateRemoveTables}/>
    <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"} fontWeight={"bold"}>[{validAddedTables.length} out of {allTables.length} tables selected]</Text>
  </>
}
