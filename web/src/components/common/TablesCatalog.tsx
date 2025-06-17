import React, { useEffect, useState } from "react"
import { FilteredTable } from './FilterableTable';
import { MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { Text, Link, HStack, Button, Tabs, TabList, TabPanels, TabPanel, Tab, VStack, Spinner, Box} from "@chakra-ui/react";
import { applyTableDiff, TableInfo, resetDefaultTablesDB, setSelectedModels } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { applyTableDiffs } from "apps";
import { isEmpty, sortBy } from "lodash";
import { BiSolidMagicWand } from "react-icons/bi";
import { ModelView } from "./ModelView";
import { MetabaseModel } from "apps/types";

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
//   const [isModelView, setIsModelView] = useState(false);

  const relevantTables = toolContext.relevantTables || []
  const dbInfo = toolContext.dbInfo
  const allTables = dbInfo.tables || []
  const allModels = dbInfo.models|| []
  const selectedModels = useSelector((state: RootState) => state.settings.selectedModels)
  // const selectedModels: MetabaseModel[] = []

  const validAddedTables = applyTableDiffs(allTables, tableDiff, dbInfo.id)

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

  if (toolContext.loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="minusxGreen.500" />
        <Text mt={4} fontSize="md" color="gray.600">Loading catalog...</Text>
      </Box>
    )
  }

  return <>
    <HStack w={"100%"} justify={"space-between"}>
        <VStack textAlign={"left"} alignItems={"flex-start"} justifyContent={"flex-start"} gap={0} m={0} p={0}>
            <Text fontSize="md" fontWeight="bold">Catalog: Default Tables</Text>
            <Text fontSize="xs" color={"minusxGreen.600"}><Link width={"100%"} textAlign={"left"} textDecoration={"underline"} href="https://docs.minusx.ai/en/articles/11166007-default-tables" isExternal>What are Default Tables?</Link></Text>
    
        </VStack>
          {/* <Button size="xs" variant="link" onClick={() => setIsModelView(!isModelView)}>
              {isModelView ? 'Tables View' : 'Model View'}
          </Button> */}
        <VStack alignItems={"flex-end"} justifyContent={"flex-end"} gap={0} m={0} p={0}>
        <Button 
            size={"xs"} 
            onClick={_resetRelevantTables} 
            colorScheme="minusxGreen"
            isDisabled={!isAnyChange}
            leftIcon={<BiSolidMagicWand />}
        >
            Reset to Smart Defaults
        </Button>
        {/* <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"} fontWeight={"bold"}>[{validAddedTables.length} out of {allTables.length} tables selected]</Text> */}
        </VStack>
        {/* <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"}>[{validAddedTables.length} out of {allTables.length} tables selected]</Text> */}
    </HStack>
    <Tabs isFitted variant='enclosed-colored' colorScheme="minusxGreen" mt={5} isLazy={true}>
        <TabList mb='1em'>
            <Tab><VStack gap={0} p={0} m={0}><Text>Catalog</Text><Text fontSize={"xs"} m={"-5px"}>[user editable]</Text></VStack></Tab>
            <Tab><VStack gap={0} p={0} m={0}><Text>Preview</Text><Text fontSize={"xs"} m={"-5px"}>[what MinusX sees]</Text></VStack></Tab>
        </TabList>
        <TabPanels>
            <TabPanel pt={0}>
                <FilteredTable 
                  dbId={dbInfo.id} 
                  tableData={allTables} 
                  modelData={allModels} 
                  selectedTableData={validAddedTables} 
                  selectedModelData={selectedModels} 
                  addFn={updateAddTables} 
                  removeFn={updateRemoveTables} 
                  updateSelectedModels={(models) => {
                    dispatch(setSelectedModels(models))
                  }}
                />
            </TabPanel>
            <TabPanel pt={0}>
                <ModelView tables={validAddedTables} metabaseModels={selectedModels} />
            </TabPanel>
        </TabPanels>
    </Tabs>
    {/* {
      isModelView ? (
        <ModelView tables={validAddedTables} />
      ) : <FilteredTable dbId={dbInfo.id} data={allTables} selectedData={validAddedTables} addFn={updateAddTables} removeFn={updateRemoveTables}/>
    } */}
  </>
}
