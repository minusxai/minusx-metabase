import React from "react"
import { FilteredTable } from '../common/FilterableTable';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';

const useAppStore = getApp().useStore()

export const Tables: React.FC<null> = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  // console.log(toolContext)
  // return <FilteredTable data={toolContext.dbInfo.tables} selectedData={toolContext.relevantTables}/>
  return <></>
}