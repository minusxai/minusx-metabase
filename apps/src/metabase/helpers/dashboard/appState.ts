import { DashboardInfo, DashboardMetabaseState } from './types';
import _ from 'lodash';
import { MetabaseAppStateDashboard } from '../DOMToState';
import { RPCs } from 'web';

const { getMetabaseState } = RPCs

function getSelectedTabDashcardIds(dashboardMetabaseState: DashboardMetabaseState) {
  const currentDashboardData = dashboardMetabaseState.dashboards?.[dashboardMetabaseState.dashboardId];
  if (!currentDashboardData) {
    return [];
  }
  const { ordered_cards, dashcards: dashcardsList } = currentDashboardData;
  const cardsList = ordered_cards ? ordered_cards : dashcardsList;
  if (!cardsList) {
    console.warn('No cards found in dashboard');
    return [];
  }
  const { selectedTabId } = dashboardMetabaseState;
  // if selectedTabId is null, then there are no tabs so return all cards
  if (!selectedTabId) 
    return cardsList;
  const { tabs } = currentDashboardData;
  if (!tabs) {
    console.warn('No tabs found in dashboard but selectedTabId is not null');
    return cardsList;
  }
  const tabIds = tabs.map(tab => tab.id);
  if (!tabIds.includes(selectedTabId)) {
    console.warn('selectedTabId is not in tabs');
    return cardsList;
  }
  const dashcards = dashboardMetabaseState.dashcards;
  const selectedTabDashcardIds = Object.values(dashcards)
    .filter(dashcard => dashcard.dashboard_tab_id === selectedTabId)
    .map(dashcard => _.get(dashcard, 'id'));
  return selectedTabDashcardIds;
}

function getDashcardInfoByIds(ids: number[], dashboardMetabaseState: DashboardMetabaseState) {
  const { dashcards } = dashboardMetabaseState;
  const dashcardsInfo = Object.values(dashcards).filter(dashcard => ids.includes(dashcard?.id));
  return dashcardsInfo;
}

export async function getDashboardAppState(): Promise<MetabaseAppStateDashboard | null> {
  const dashboardMetabaseState: DashboardMetabaseState = await getMetabaseState('dashboard') as DashboardMetabaseState;
  if (!dashboardMetabaseState || !dashboardMetabaseState.dashboards || !dashboardMetabaseState.dashboardId) {
    console.warn('Could not get dashboard info');
    return null;
  }
  const { dashboardId } = dashboardMetabaseState;
  let dashboardInfo: DashboardInfo = {
    id: dashboardId,
    name: _.get(dashboardMetabaseState, ['dashboards', dashboardId, 'name']),
    description: _.get(dashboardMetabaseState, ['dashboards', dashboardId, 'description']),
    parameters: _.get(dashboardMetabaseState, ['dashboards', dashboardId, 'parameters'], []).map(param => ({
      name: _.get(param, 'name'),
      id: _.get(param, 'id'),
      type: _.get(param, 'type'),
      value: _.get(dashboardMetabaseState, ['parameterValues', param.id], param.default)
    })),
    selectedTabId: _.get(dashboardMetabaseState, ['selectedTabId'], null),
    tabs: _.get(dashboardMetabaseState, ['dashboards', dashboardId, 'tabs'], []).map(tab => ({
      id: _.get(tab, 'id'),
      name: _.get(tab, 'name')
    })),
    visibleDashcards: [],
  }
  const selectedTabDashcardIds = getSelectedTabDashcardIds(dashboardMetabaseState);
  const dashcardsInfo = getDashcardInfoByIds(selectedTabDashcardIds, dashboardMetabaseState);
  dashboardInfo.visibleDashcards = dashcardsInfo.map(dashcard => ({
    id: dashcard.id,
    name: dashcard?.card?.name,
    ...(dashcard?.card?.description ? { description: dashcard?.card?.description } : {}),
    visualizationType: dashcard?.card?.display
  }))
  // filter out dashcards with null names or ids
  .filter(dashcard => dashcard.name !== null && dashcard.id !== null);
  // remove description if it's null or undefined
  if (!dashboardInfo.description) {
    delete dashboardInfo.description;
  }
  return dashboardInfo;
}