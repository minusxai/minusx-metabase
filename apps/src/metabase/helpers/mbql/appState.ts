import { MetabaseAppStateMBQLEditor,  MetabaseAppStateType} from '../DOMToState';
import { RPCs } from 'web';
import { MBQLInfo, getSourceTableIds } from './utils';
import { getMBQLState, getSelectedDbId } from '../metabaseStateAPI';
import { getDatabaseInfo } from '../metabaseAPIHelpers';
import { get, find } from 'lodash';
import { getTableContextYAML } from '../catalog';
import { getTablesWithFields } from '../getDatabaseSchema';


export async function getMBQLAppState(): Promise<MetabaseAppStateMBQLEditor | null> {
  const url = new URL(await RPCs.queryURL()).origin;

  const appSettings = RPCs.getAppSettings();
  const selectedCatalog = get(find(appSettings.availableCatalogs, { name: appSettings.selectedCatalog }), 'content')
  const dbId = await getSelectedDbId();
  const selectedDatabaseInfo = dbId ? await getDatabaseInfo(dbId) : undefined
  const mbqlState = await getMBQLState();
  const mbqlInfo: MBQLInfo = {
    mbqlQuery: mbqlState.query
  }
  
  const sourceTableIds = getSourceTableIds(mbqlState?.dataset_query?.query);

  const relevantTablesWithFields = await getTablesWithFields(appSettings.tableDiff, appSettings.drMode, !!selectedCatalog, [], sourceTableIds)
  const tableContextYAML = getTableContextYAML(relevantTablesWithFields, selectedCatalog, appSettings.drMode);

  return { 
    ...mbqlInfo,
    type: MetabaseAppStateType.MBQLEditor,
    tableContextYAML,
    selectedDatabaseInfo,
    metabaseOrigin: url,
};
}
