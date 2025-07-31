import { FormattedTable } from './types';
import { getTablesFromSqlRegex, TableAndSchema } from './parseSql';
import _ from 'lodash';
import { getSelectedDbId } from './metabaseStateAPI';
import { getUserTables, searchUserQueries, getDatabaseTablesAndModelsWithoutFields } from './metabaseAPIHelpers';
import { applyTableDiffs, handlePromise } from '../../common/utils';
import { TableDiff } from 'web/types';
import { getTableData } from './metabaseAPIHelpers';

// Types moved to metabaseAPITypes.ts
export type { DatabaseInfo, DatabaseInfoWithTablesAndModels } from './metabaseAPITypes';

function getTableKey<T extends TableAndSchema>(tableInfo: T): string {
  return `${tableInfo.schema?.toLowerCase()}.${tableInfo.name.toLowerCase()}`;
}

function dedupeAndCountTables<T extends TableAndSchema>(tables: T[]): T[] {
  const counts: Record<string, T> = {}
  tables.forEach(tableInfo => {
    const key = getTableKey(tableInfo);
    const existingCount = tableInfo.count || 1;
    const totalCounts = counts[key]?.count || 0;
    counts[key] = {
      ...tableInfo,
      count: totalCounts + existingCount
    }
  })
  return _.chain(counts).toArray().orderBy(['count'], ['desc']).value();
}

function lowerAndDefaultSchemaAndDedupe(tables: TableAndSchema[]): TableAndSchema[] {
  let lowered = tables.map(tableInfo => ({
    name: tableInfo.name.toLowerCase(),
    schema: tableInfo.schema?.toLowerCase() || 'public',
    count: tableInfo.count
  }));
  return dedupeAndCountTables(lowered);
}

export const validateTablesInDB = (tables: TableAndSchema[], allDBTables: FormattedTable[], default_schema?: string) => {
  const allTablesAsMap = _.fromPairs(allDBTables.map(tableInfo => [getTableKey(tableInfo), tableInfo]));
  if (default_schema) {
    tables = tables.map(tableInfo => {
      return {
        ...tableInfo,
        schema: tableInfo.schema?.toLowerCase() || default_schema.toLowerCase()
      }
    })
  }
  return tables.filter(
    tableInfo => getTableKey(tableInfo) in allTablesAsMap
  ).map(tableInfo => ({
    ...tableInfo,
    ...allTablesAsMap[getTableKey(tableInfo)],
  }))
}

const addTableJoins = (tables: FormattedTable[], tableMap: Record<number | string, number[][]>) => {
  return tables.map(tableInfo => {
    return ({
      ...tableInfo,
      ...(tableInfo.id in tableMap ? {
        related_tables_freq: tableMap[tableInfo.id]
      } : {}),
    })
  })
}

export const getAllRelevantTablesForSelectedDb = async (dbId: number): Promise<FormattedTable[]> => {
  const [userTables, {tables: allDBTables, default_schema}] = await Promise.all([
    getUserTables(dbId),
    handlePromise(getDatabaseTablesAndModelsWithoutFields(dbId), "Failed to get database tables", {
      name: '', description: '', id: 0, dialect: '', default_schema: '',
      dbms_version: { flavor: '', version: '', semantic_version: [] },
      tables: [],
      models: []
    })
  ]);
  const tableMap = {}; // Empty table map - was getUserTableMap() placeholder
  const validTables = validateTablesInDB(userTables, allDBTables, default_schema);
  const dedupedTables = dedupeAndCountTables([...validTables, ...allDBTables]);
  dedupedTables.forEach(tableInfo => {
    tableInfo.count = tableInfo.count || 1;
    tableInfo.count = tableInfo.count - 1
  })
  const fullTableInfo = addTableJoins(dedupedTables, tableMap);
  return fullTableInfo
}


export const searchTables = async (userId: number, dbId: number, query: string): Promise<FormattedTable[]> => {
  const [userTables, {tables: allDBTables, default_schema}] = await Promise.all([
    searchUserQueries(userId, dbId, query),
    getDatabaseTablesAndModelsWithoutFields(dbId),
  ]).catch(err => {
    console.warn("[minusx] Error getting search tables", err);
    throw err;
  });
  const allUserTables = dedupeAndCountTables(userTables);
  const validTables = validateTablesInDB(allUserTables, allDBTables, default_schema);
  const dedupedTables = dedupeAndCountTables(validTables)
  return dedupedTables
}

export const getTablesWithFields = async (tableDiff?: TableDiff, drMode = false, isCatalogSelected: boolean = false, sqlTables: TableAndSchema[] = [], mbqlTableIds: number[] = []) => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting tables with fields");
    return [];
  }
  let tables = await getAllRelevantTablesForSelectedDb(dbId);
  // Don't apply a table diff if a catalog is selected in dr mode. We need all tables.
  if (tableDiff && !(isCatalogSelected && drMode)) {
    tables = applyTableDiffs(tables, tableDiff, dbId, sqlTables, mbqlTableIds);
  }
  if (!drMode) {
    return tables;
  }
  // if in deep research mode and a non-default catalog is selected, we don't need
  // table fields since we'll be using the catalog instead
  if (isCatalogSelected) {
    return tables;
  }
  const tableIds = tables.map((table) => table.id);
  let tableInfos = await Promise.all(tableIds.map(id => getTableData(id)));
  return tableInfos.filter(tableInfo => tableInfo != "missing")
}



export const getRelevantTablesForSelectedDb = async (): Promise<FormattedTable[]> => {
  const dbId = await getSelectedDbId();
  if (!dbId) {
    console.warn("[minusx] No database selected when getting relevant tables");
    return [];
  }
  const relevantTables = await getAllRelevantTablesForSelectedDb(dbId);
  
  // Filter out tables with > 100 columns to reduce context size
  // Fetch all table data in parallel for better performance
  const tableDataPromises = relevantTables.slice(0, 30).map(async (table) => {
    try {
      const tableWithFields = await getTableData(table.id);
      if (tableWithFields !== "missing") {
        const columnCount = Object.keys(tableWithFields.columns || {}).length;
        return { table, columnCount, valid: columnCount <= 100 };
      }
    } catch (error) {
      // If we can't fetch table data, include it anyway to be safe
      return { table, columnCount: 0, valid: true };
    }
    return { table, columnCount: 0, valid: false };
  });

  const tableResults = await Promise.all(tableDataPromises);
  // Filter and limit to 20 tables
  const filteredTables = tableResults
    .filter(result => result.valid)
    .slice(0, 20)
    .map(result => result.table);
  
  return filteredTables;
}

// Empty Placeholder
export const getTopSchemasForSelectedDb = async () => {
  return []
}
