import React, { useEffect } from "react"
import { FilteredTable } from './FilterableTable';
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { Text, Link, HStack, Button} from "@chakra-ui/react";
import { applyTableDiff, TableInfo, setSelectedCatalog } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { applyTableDiffs } from "apps";
import { isEmpty, sortBy } from "lodash";
import { BiSolidMagicWand } from "react-icons/bi";

const useAppStore = getApp().useStore()

const NUM_RELEVANT_TABLES = 15


export const TablesCatalog: React.FC<null> = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const tableDiff = useSelector((state: RootState) => state.settings.tableDiff)

  const relevantTables = toolContext.relevantTables || []
  const dbInfo = toolContext.dbInfo
  const allTables = dbInfo?.tables || []

  const updatedRelevantTables = applyTableDiffs('', allTables, tableDiff, dbInfo.id)
  const [isChanged, setIsChanged] = React.useState(false)
  
  const updateAddTables = (tables: TableInfo[]) => {
    dispatch(applyTableDiff({
      actionType: 'add',
      tables
    }))
  }
  const updateRemoveTables = (tables: TableInfo[], emptyAllowed = false) => {
    dispatch(applyTableDiff({
      actionType: 'remove',
      tables
    }))
  }

  const resetRelevantTables = () => {
    updateRemoveTables(tableDiff.add.filter((item: TableInfo) => item.dbId == dbInfo.id), true)
    updateAddTables(relevantTables.slice(0, NUM_RELEVANT_TABLES).map((table) => ({
      name: table.name,
      schema: table.schema,
      dbId: dbInfo.id
    })))
  }

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

  const isAnyChange = tableDiff.remove.length > 0 || isAnyTablesAdded()

  useEffect(() => {
    if (isEmpty(updatedRelevantTables) && !isChanged) {
      resetRelevantTables()
    }
    setIsChanged(true)
  }, [updatedRelevantTables])
  
  return <>
    <HStack w={"100%"} justify={"space-between"}>
        <Text fontSize="md" fontWeight="bold">Catalog: Default Tables</Text>
        <Button 
            size={"xs"} 
            onClick={resetRelevantTables} 
            colorScheme="minusxGreen"
            isDisabled={!isAnyChange}
            leftIcon={<BiSolidMagicWand />}
        >
            Reset to Smart Defaults
        </Button>
        {/* <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"}>[{updatedRelevantTables.length} out of {allTables.length} tables selected]</Text> */}
    </HStack>
    <Text fontSize="xs" color={"minusxGreen.600"}><Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11166007-default-tables" isExternal>What are Default Tables?</Link></Text>
    <FilteredTable dbId={dbInfo.id} data={allTables} selectedData={updatedRelevantTables} addFn={updateAddTables} removeFn={updateRemoveTables}/>
    <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"} fontWeight={"bold"}>[{updatedRelevantTables.length} out of {allTables.length} tables selected]</Text>
  </>
}
