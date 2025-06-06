import _, { flatMap, get } from 'lodash';
import { memoize, RPCs, configs } from 'web'
import { FormattedTable } from './types';
import { deterministicSample } from '../../common/utils';

// Wrapper around RPCs.fetchData with concurrency control
const fetchDataQueue: (() => Promise<any>)[] = [];
let activeFetches = 0;
const MAX_CONCURRENT_FETCHES = 20;

async function fetchDataWithConcurrency(url: string, method: string = 'GET'): Promise<any> {
  return new Promise((resolve, reject) => {
    const fetchTask = async () => {
      try {
        activeFetches++;
        const result = await RPCs.fetchData(url, method);
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        activeFetches--;
        processQueue();
      }
    };

    if (activeFetches < MAX_CONCURRENT_FETCHES) {
      fetchTask();
    } else {
      fetchDataQueue.push(fetchTask);
    }
  });
}

function processQueue() {
  while (fetchDataQueue.length > 0 && activeFetches < MAX_CONCURRENT_FETCHES) {
    const nextTask = fetchDataQueue.shift();
    if (nextTask) {
      nextTask();
    }
  }
}

export const extractTableInfo = (table: any, includeFields: boolean = false, schemaKey: string = 'schema'): FormattedTable => ({
  name: _.get(table, 'name', ''),
  ...(_.get(table, 'description', null) != null && { description: _.get(table, 'description', null) }),
  schema: _.get(table, schemaKey, ''),
  id: _.get(table, 'id', 0),
  ...(
    _.get(table, 'count') ? { count: _.get(table, 'count') } : {}
  ),
  ...(
    includeFields
    ? {
      columns: _.map(_.get(table, 'fields', []), (field: any) => ({
        name: _.get(field, 'name', ''),
        id: _.get(field, 'id'),
        type: field?.target?.id ? 'FOREIGN KEY' : _.get(field, 'database_type', null),
        // only keep description if it exists. helps prune down context
        ...(_.get(field, 'description', null) != null && { description: _.get(field, 'description', null) }),
        // get foreign key info
        ...(field?.target?.table_id != null && { fk_table_id: field?.target?.table_id }),
        ...(field?.target?.name != null && { foreign_key_target: field?.target?.name }),
      }))
    }
    : {}
  ),
})

async function getUniqueValsFromField(fieldId: number) {
  const resp: any = await fetchDataWithConcurrency(`/api/field/${fieldId}/values`, 'GET');
  return resp
}

// Helper function to determine if a field type is numeric
function isNumericType(type: string): boolean {
  if (!type) return false;
  const numericTypes = [
    'INTEGER', 'BIGINT', 'DECIMAL', 'DOUBLE', 'FLOAT', 'NUMERIC', 'REAL',
    'SMALLINT', 'TINYINT', 'NUMBER', 'INT', 'LONG', 'SHORT'
  ];
  return numericTypes.some(numericType => type.toUpperCase().includes(numericType));
}

// Helper function to truncate long unique values
function truncateUniqueValue(value: any): any {
  if (typeof value === 'string' && value.length > 100) {
    return value.substring(0, 100) + '... (truncated)';
  }
  return value;
}


const fetchTableMetadata = async (tableId: number) => {
  const resp: any = await fetchDataWithConcurrency(
    `/api/table/${tableId}/query_metadata`,
    "GET"
  );
  if (!resp) {
    console.warn("Failed to get table schema", tableId, resp);
    return "missing";
  }
  const tableInfo = extractTableInfo(resp, true);
  
  // Get distinct counts from the network response fingerprint data
  const fieldsWithDistinctCount = (resp.fields || []).map((field: any) => ({
    id: field.id,
    distinctCount: field.fingerprint?.global?.['distinct-count'] || 0
  }));
  
  return { tableInfo, fieldsWithDistinctCount };
}

const fetchUniqueValues = async (tableInfo: FormattedTable, fieldsWithDistinctCount: any[]) => {
  // Only fetch unique values for non-numeric columns with distinct-count < 100
  const nonNumericFields = Object.values(tableInfo.columns || {}).filter((field) => 
    !isNumericType(field.type)
  );
  
  // Create a map for quick lookup
  const distinctCountMap = Object.fromEntries(
    fieldsWithDistinctCount.map((field: {id: number, distinctCount: number}) => [field.id, field.distinctCount])
  );
  
  // Filter fields that have distinct-count < 100
  const fieldsToFetchUniqueValues = nonNumericFields.filter((field) => {
    const distinctCount = distinctCountMap[field.id] || 0;
    return distinctCount > 0 && distinctCount < 100;
  });
  
  const fieldIds = fieldsToFetchUniqueValues.map((field) => field.id);
  const fieldIdUniqueValMapping: Record<number, any> = {}
  
  const uniqueValsResults = await Promise.all(
    fieldIds.map(async (fieldId) => {
      try {
        const uniqueVals = await getUniqueValsFromField(fieldId);
        return { fieldId, uniqueVals };
      } catch (error) {
        console.warn(`Failed to fetch unique values for field ${fieldId}:`, error);
        return { fieldId, uniqueVals: null };
      }
    })
  );
  
  // Map results back to fieldIdUniqueValMapping
  uniqueValsResults.forEach(({ fieldId, uniqueVals }) => {
    if (uniqueVals !== null) {
      fieldIdUniqueValMapping[fieldId] = uniqueVals;
    }
  });
  
  return fieldIdUniqueValMapping;
}

const memoizedFetchTableMetadata = memoize(fetchTableMetadata);
const memoizedFetchUniqueValues = memoize(fetchUniqueValues);

export const fetchTableData = async (tableId: number, uniqueValues = false) => {
  const metadataResult = await memoizedFetchTableMetadata(tableId);
  if (metadataResult === "missing") {
    return "missing";
  }
  
  const { tableInfo, fieldsWithDistinctCount } = metadataResult;
  
  //#HACK to disable unique values for now
  return tableInfo
  if (!uniqueValues) {
    return tableInfo;
  }
  
  const fieldIdUniqueValMapping = await memoizedFetchUniqueValues(tableInfo, fieldsWithDistinctCount);
  
  // Apply unique values to table info
  Object.values(tableInfo.columns || {}).forEach((field) => {
    const fieldUnique = fieldIdUniqueValMapping[field.id]
    if (fieldUnique) {
      const rawValues = flatMap(get(fieldUnique, 'values', [])).map(truncateUniqueValue)
      const originalHasMore = get(fieldUnique, 'has_more_values', false)
      
      // Limit to 20 values with deterministic sampling at storage time
      if (rawValues.length > 20) {
        field.unique_values = deterministicSample(rawValues, 20, `${tableInfo.name}.${field.name}`)
        field.has_more_values = true
      } else {
        field.unique_values = rawValues
        field.has_more_values = originalHasMore
      }
    }
  })
  
  return tableInfo;
}