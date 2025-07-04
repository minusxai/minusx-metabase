import { MetabaseAppStateMBQLEditor,  MetabaseAppStateType} from '../DOMToState';
import { getParsedIframeInfo, RPCs } from 'web';
import { MBQLInfo, getSourceTableIds } from './utils';
import { getMBQLState, getSelectedDbId } from '../metabaseStateAPI';
import { getAllRelevantModelsForSelectedDb, getDatabaseInfo } from '../metabaseAPIHelpers';
import { get, find } from 'lodash';
import { getTableContextYAML } from '../catalog';
import { getTablesWithFields } from '../getDatabaseSchema';
import { getModelsWithFields, getSelectedAndRelevantModels } from '../metabaseModels';


export async function getMBQLAppState(): Promise<MetabaseAppStateMBQLEditor | null> {
  const url = new URL(await RPCs.queryURL()).origin;

  const appSettings = RPCs.getAppSettings();
  const selectedCatalog = get(find(appSettings.availableCatalogs, { name: appSettings.selectedCatalog }), 'content')
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined
  const defaultSchema = selectedDatabaseInfo?.default_schema;
  const mbqlState = await getMBQLState();
  const mbqlInfo: MBQLInfo = {
    mbqlQuery: mbqlState.dataset_query.query
  }
  
  const allModels = dbId ?  await getAllRelevantModelsForSelectedDb(dbId) : []
  const relevantModels = await getSelectedAndRelevantModels('', appSettings.selectedModels, allModels)
  const relevantModelsWithFields = await getModelsWithFields(relevantModels)
  const sourceTableIds = getSourceTableIds(mbqlState?.dataset_query?.query);

  let relevantTablesWithFields = await getTablesWithFields(appSettings.tableDiff, appSettings.drMode, !!selectedCatalog, [], sourceTableIds)
  relevantTablesWithFields = relevantTablesWithFields.map(table => {
    if (table.schema === undefined || table.schema === '') {
      table.schema = defaultSchema || 'unknown'
    }
    return table
  })
  const relevantModelsWithFieldsMod = relevantModelsWithFields.map(model => {
    return {
      ...model,
      id: 'card__' + model.id, // prefix with 'card__' to avoid conflicts with table IDs
    }
  })
  const allFormattedTables = [...relevantTablesWithFields, ...relevantModelsWithFieldsMod]
  const tableContextYAML = getTableContextYAML(allFormattedTables, selectedCatalog, appSettings.drMode, true);

  return { 
    ...mbqlInfo,
    type: MetabaseAppStateType.MBQLEditor,
    tableContextYAML,
    selectedDatabaseInfo,
    metabaseOrigin: url,
    isEmbedded: getParsedIframeInfo().isEmbedded
  };
}
