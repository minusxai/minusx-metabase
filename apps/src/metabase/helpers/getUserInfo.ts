import _, { isEmpty } from 'lodash';
import { RPCs } from 'web'
const { getMetabaseState } = RPCs;
import { isDashboardPageUrl } from './dashboard/util';

export async function getSelectedDbId(): Promise<number | undefined> {
  const url = await RPCs.queryURL();
  const isDashboard = isDashboardPageUrl(url);
  let dbId;
  if (isDashboard) {
    const dashcards = await getMetabaseState('dashboard.dashcards') as any;
    const dbIds = Object.values(dashcards || []).map((d: any) => d.card.database_id);
    dbId = _.chain(dbIds).countBy().toPairs().maxBy(_.last).head().value();
    try {
      dbId = parseInt(dbId);
    } catch (e) {}
  }
  else {
    dbId = await getMetabaseState('qb.card.dataset_query.database')
  }
  if (!dbId || !Number(dbId)) {
    console.error('Failed to find database id', JSON.stringify(dbId));
    return undefined;
  }
  return  Number(dbId);
}