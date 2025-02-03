import React from "react"
import { FilteredTable } from '../common/FilterableTable';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { Text, Box, Badge, Link} from "@chakra-ui/react";
import { addTable, removeTable, TableDiff } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';

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

const tablesToRemove = tableDiff
.filter((diff: TableDiff) => diff.action === 'remove')
.map((diff: TableDiff) => diff.table)

const tablesToAdd = tableDiff
.filter((diff: TableDiff) => diff.action === 'add')
.map((diff: TableDiff) => diff.table);

const filteredRelevantTables = relevantTables.filter(
  table => !tablesToRemove.includes(table.name)
);

const tablesToAppend = allTables.filter(
  table => tablesToAdd.includes(table.name)
);

const updatedRelevantTables = [...filteredRelevantTables];

tablesToAppend.forEach(table => {
  if (!updatedRelevantTables.some(existing => existing.name === table.name)) {
    updatedRelevantTables.push(table);
  }
});

  
  const updateAddTables = (value: string) => {
    dispatch(addTable(value))
  }

  const updateRemoveTables = (value: string) => {
    dispatch(removeTable(value))
  }
  
  return <>
    <Text fontSize="lg" fontWeight="bold">Tables</Text>
    <Text color={"minusxBW.600"} fontSize="sm">The selected tables are in MinusX context while answering queries. You can select/unselect tables to control the context.</Text>

    <Box mt={2} mb={2}>
    <Text fontWeight="bold">DB Info</Text>
    <Text fontSize="sm"><Text as="span">{dbInfo.name}</Text></Text>
    <Text fontSize="sm"><Text as="span">{dbInfo.description}</Text></Text>
    <Text fontSize="sm"><Text as="span">SQL Dialect: </Text><Badge color={"minusxGreen.600"}>{dbInfo.dialect}</Badge></Text>
    </Box>
    <FilteredTable data={allTables} selectedData={updatedRelevantTables} searchKey={"name"} displayKeys={['name', 'description']} addFn={updateAddTables} removeFn={updateRemoveTables}/>
    <Text fontSize="sm" color={"minusxGreen.600"} mt={2}>{updatedRelevantTables.length} out of {allTables.length} tables selected | <Link width={"100%"} textAlign={"center"} textDecoration={"underline"} href="https://minusx.ai/pricing/" isExternal>Read more about table context here</Link></Text>
  </>
}