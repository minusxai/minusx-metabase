import { DashboardInfo, DashboardMetabaseState } from './types';
import _ from 'lodash';
import { MetabaseAppStateDashboard } from '../DOMToState';
import { RPCs } from 'web';
import { metabaseToMarkdownTable } from '../operations';

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
  const selectedTabId = getSelectedTabId(dashboardMetabaseState);
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

function getSelectedTabId(dashboardMetabaseState: DashboardMetabaseState) {
  const { dashboardId } = dashboardMetabaseState;
  const selectedTabId = _.get(dashboardMetabaseState, ['selectedTabId'], null)
  // sometimes selectedTabId is null because no tab is explicitly selected, so
  // need to select the first tab. other times its null because its an older metabase
  // version without tabs
  const tabs = _.get(dashboardMetabaseState, ['dashboards', dashboardId, 'tabs'], []);
  if (!selectedTabId && tabs.length > 0) {
    return tabs[0].id;
  }
  return selectedTabId;
}

export type DashboardInfoForModelling = {
  id: number,
  name: string | undefined,
  description?: string | undefined,
  cards: {
    id: number,
    name: string,
    sql: string,
    description?: string | undefined,
    outputTableMarkdown?: string,
  }[]
}

function getDashcardInfoForModelling(dashboardMetabaseState: DashboardMetabaseState, dashcardId: number): DashboardInfoForModelling['cards'][number] | null {
  const dashcard = dashboardMetabaseState.dashcards[dashcardId];
  if (!dashcard) {
    return null;
  }
  const cardId = _.get(dashcard, 'card_id', '');
  const id = _.get(dashcard, 'id');
  const query_type = _.get(dashcard, 'card.query_type', 'unknown');
  const sql = _.get(dashcard, 'card.dataset_query.native.query', '');
  const name = _.get(dashcard, 'card.name', '');
  const description = _.get(dashcard, 'card.description', '');
  if (!name)
    return null;
  if (!sql || query_type != 'native')
    return null;
  const obj = {
    id,
    sql,
    name,
    ...(description ? { description } : {}),
  }
  // dashcardData
  const data = _.get(dashboardMetabaseState, ['dashcardData', dashcardId, cardId, 'data']);
  if (!data) {
    return obj
  }
  const dataAsMarkdown = metabaseToMarkdownTable(data, 1000);
  return {
   ...obj,
   outputTableMarkdown: dataAsMarkdown
  }
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
    selectedTabId: getSelectedTabId(dashboardMetabaseState),
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


export async function getDashboardInfoForModelling(): Promise<DashboardInfoForModelling | undefined> {
  const dashboardMetabaseState: DashboardMetabaseState = await getMetabaseState('dashboard') as DashboardMetabaseState;
  if (!dashboardMetabaseState || !dashboardMetabaseState.dashboards || !dashboardMetabaseState.dashboardId) {
    console.warn('Could not get dashboard info');
    return undefined;
  }
  const { dashboardId } = dashboardMetabaseState;
  const name = _.get(dashboardMetabaseState, ['dashboards', dashboardId, 'name']);
  const selectedTabDashcardIds = getSelectedTabDashcardIds(dashboardMetabaseState);
  const cards = selectedTabDashcardIds.map(dashcardId => getDashcardInfoForModelling(dashboardMetabaseState, dashcardId))
  const filteredCards = _.compact(cards);
  console.log("<><><><><>< cards", cards)
  return {
    id: dashboardId,
    name,
    cards: filteredCards
  }
}