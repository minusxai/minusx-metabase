/**
 * Metabase State API Functions
 * 
 * Functions that interact with Metabase DOM state via getMetabaseState.
 * These functions extract data directly from the Metabase interface.
 */

import { RPCs } from 'web';
import { isEmpty } from 'lodash';
import { isDashboardPageUrl } from './dashboard/util';
import _ from 'lodash';

const { getMetabaseState } = RPCs;

// =============================================================================
// USER STATE FUNCTIONS
// =============================================================================

interface UserInfo {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  personal_collection_id: number;
}

/**
 * Get current user information from Metabase state
 */
export async function getCurrentUserInfo(): Promise<UserInfo | undefined> {
  const userInfo = await getMetabaseState('currentUser') as UserInfo;
  if (isEmpty(userInfo)) {
    console.error('Failed to load user info');
    return undefined;
  }
  return userInfo;
}

// =============================================================================
// DATABASE STATE FUNCTIONS
// =============================================================================

/**
 * Get selected database ID from current Metabase state
 */
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
  } else {
    // this works for both MBQL and SQL pages
    dbId = await getMetabaseState('qb.card.dataset_query.database');
    if (!dbId) {
        const entity_dbs = await getMetabaseState('entities.databases') as object;
        dbId = _.find(entity_dbs, (db: any) => !db.is_sample)?.id || Object.keys(entity_dbs)[0];
    }
  }
  
  if (!dbId || !Number(dbId)) {
    console.error('Failed to find database id', JSON.stringify(dbId));
    return undefined;
  }
  return Number(dbId);
}

// =============================================================================
// QUERY STATE FUNCTIONS
// =============================================================================

/**
 * Get current query from Metabase state
 */
export async function getCurrentQuery(): Promise<string | undefined> {
  return await getMetabaseState('qb.card.dataset_query.native.query') as string;
}


// =============================================================================
// QUERY EXECUTION STATE FUNCTIONS  
// =============================================================================

/**
 * Check if query is currently running
 */
export async function isQueryRunning(): Promise<boolean> {
  return await getMetabaseState('qb.uiControls.isRunning') as boolean;
}

/**
 * Check if query has been executed (has results)
 */
export async function hasQueryResults(): Promise<boolean> {
  return await getMetabaseState('qb.queryResults') !== null;
}

/**
 * Get query results data
 */
export async function getQueryResults(): Promise<any> {
  return await getMetabaseState('qb.queryResults[0].data');
}

/**
 * Get query error message
 */
export async function getQueryError(): Promise<any> {
  return await getMetabaseState('qb.queryResults[0].error');
}

// =============================================================================
// UI STATE FUNCTIONS
// =============================================================================

/**
 * Check if native editor is open
 */
export async function isNativeEditorOpen(): Promise<boolean> {
  return await getMetabaseState('qb.uiControls.isNativeEditorOpen') as boolean;
}

/**
 * Check if showing raw table view
 */
export async function isShowingRawTable(): Promise<boolean> {
  return await getMetabaseState('qb.uiControls.isShowingRawTable') as boolean;
}

/**
 * Check if chart type sidebar is showing
 */
export async function isShowingChartTypeSidebar(): Promise<boolean> {
  return await getMetabaseState('qb.uiControls.isShowingChartTypeSidebar') as boolean;
}

/**
 * Get current visualization type
 */
export async function getVisualizationType(): Promise<string> {
  return await getMetabaseState('qb.card.display') as string;
}

/**
 * Get visualization settings
 */
export async function getVisualizationSettings(): Promise<any> {
  return await getMetabaseState('qb.card.visualization_settings');
}

// =============================================================================
// CARD STATE FUNCTIONS
// =============================================================================

/**
 * Get current card (query) from Metabase state
 */
export async function getCurrentCard(): Promise<any> {
  return await getMetabaseState('qb.card');
}

/**
 * Get current parameter values
 */
export async function getParameterValues(): Promise<any> {
  return await getMetabaseState('qb.parameterValues');
}

// =============================================================================
// SNIPPETS STATE FUNCTIONS
// =============================================================================

/**
 * Get all snippets from Metabase state
 */
export async function getSnippets(): Promise<any> {
  return await getMetabaseState('entities.snippets');
}

// =============================================================================
// DASHBOARD STATE FUNCTIONS
// =============================================================================

/**
 * Get complete dashboard state from Metabase
 */
export async function getDashboardState(): Promise<any> {
  return await getMetabaseState('dashboard');
}

export async function getMBQLState(): Promise<any> {
  return await getMetabaseState('qb.card')
}

export async function getQLType(): Promise<string> {
  const queryType = await getMetabaseState('qb.card.dataset_query.type') as string;
  return queryType
}
