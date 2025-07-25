import { omit, pick } from "lodash";
import { DashboardInfo } from "./dashboard/types";
import { Card, FormattedTable, ParameterValues } from "./types";
import { MetabaseTableOrModel } from "./metabaseAPITypes";

export enum MetabaseAppStateType {
    SQLEditor = 'metabaseSQLEditor',
    Dashboard = 'metabaseDashboard',
    SemanticQuery = 'metabaseSemanticQuery',
    MBQLEditor = 'metabaseMBQLEditor'
}

interface MetabaseAppStateBase {
  type: string
  version: string
  metabaseOrigin: string;
  metabaseUrl: string;
  isEmbedded: boolean;
  limitedEntities: MetabaseTableOrModel[];
}

export interface MetabaseAppStateSQLEditorV2 extends MetabaseAppStateBase {
  type: MetabaseAppStateType.SQLEditor
  version: '2'
  currentCard: Card
  outputMarkdown: string
  parameterValues: ParameterValues
}

export interface MetabaseAppStateDashboardV2 extends MetabaseAppStateBase {
  // state.dashboard's dashboards[dashboardId], remove unused fields
  // state.dashboard's parameterValues
  // state.dashboard's dashcards[selected card ids]'s processed card, parameter_mappings, size_x, size_y, row, col, created_at, outputMarkdown
  currentDashboard: DashboardInfo
  parameterValues: ParameterValues
}

const fieldsToRemove = [
  'cache_invalidated_at',
  'archived', 
  'collection_position',
  'source_card_id',
  'result_metadata',
  'creator',
  'initially_published_at',
  'enable_embedding',
  'collection_id',
  'made_public_by_id',
  'embedding_params',
  'cache_ttl',
  'archived_directly',
  'collection_preview'
];

export function processCard(card: Card): Card {
  // Remove unused fields from the card
  const cleanCard: any = omit(card, fieldsToRemove);
    
  // Process nested fields - keep only specific properties
  if (cleanCard['last-edit-info']) {
    cleanCard['last-edit-info'] = pick(cleanCard['last-edit-info'], ['timestamp']);
  }
  
  if (cleanCard.collection) {
    cleanCard.collection = pick(cleanCard.collection, ['slug']);
  }
    
  return cleanCard;
}