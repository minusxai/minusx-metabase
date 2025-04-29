// this is the shape of the .dashboard key from sample-metabase-state.json

import { MetabaseStateTable } from "../operations";

// actually only a subset of it that i care about

type Parameter = {
  id: string;
  type: string;
  target: [
    "variable" | "dimension",
    [
      "template-tag",
      name: string
    ]
  ]
  name: string;
  slug: string;
  default?: string | string[]
}
export interface DashboardMetabaseState {
  dashboardId: number;
  loadingControls?: {
    documentTitle: string;
    showLoadCompleteFavicon: boolean;
  };
  selectedTabId: number | null;
  dashboards: {
    [key: number]: {
      description: string | null;
      // one of ordered_cards or dashcards should be present
      ordered_cards?: number[];
      dashcards?: number[];
      // tabs is also optional
      tabs?: {
        id: number;
        name: string;
      }[];
      name: string;
      id: number;
      // these are the filters that are applied to the cards
      parameters: Parameter[];
      param_fields: {
        [key: string]: {
          id: number;
          // should ideally be using table_id + name to figure out full column path
          // right now just using name itself.
          name: string
        }
      }
    };
  };
  dashcards: {
    [key: number]: {
      dashboard_tab_id?: number;
      id: number;
      card: {
        // this is the card id, not the dashcard id! commenting out to avoid confusion and misuse
        // id: number;
        // card_id is required to refer to the correct dashcardData object
        card_id: number;
        database_id: number;
        description: string | null;
        result_metadata: {
          display_name: string;
          base_type: string;
        }[];
        query_type: 'native' | 'query';
        dataset_query: {
          native?: {
            query: string
            "template-tags": {
              [key: string]: {
                id: string;
                name: string;
                "display-name": string;
                type: string;
                required?: boolean;
                default?: string | string[];
                dimension?: [
                  "field",
                  fieldId: number,
                  null
                ],
                "widget-type"?: string
              }
            }
          }
        }
        name: string;
        display: string;
        // not keeping this because even metabase code uses {[key: string]: unknown} for visualization_settings lol
        // visualization_settings: {};
        parameters: Parameter[]
      },
      size_x: number;
      size_y: number;
      row: number;
      col: number;
      parameter_mappings: {
        parameter_id: string;
        card_id: number;
        target: [
          "variable" | "dimension",
          [
            "template-tag",
            name: string 
          ]
        ]
      }[]
    }
  },
  dashcardData: {
    // this is dashcard id
    [key: number]: {
      // this is card id
      [key: number]: {
        data: MetabaseStateTable
      }
    }
  },
  // dashcards that are still loading. dashcardData will be empty for these
  loadingDashcards?: {
    loadingIds: number[];
    loadingStatus: string;
  },
  parameterValues?: {
    [key: string]: string | null;
  };
}

export interface DashcardInfo {
  id: number,
  name: string,
  databaseId: number,
  description?: string | null,
  sql?: string,
  outputTableMarkdown?: string
  visualizationType?: string,
}

export interface DashboardInfo  {
  id: number,
  name?: string,
  description?: string | null,
  selectedTabId?: number | null,
  tabs?: {
    id: number,
    name: string
  }[],
  cards: DashcardInfo[]
  // removing parameters altogether from dashboard state for now.
  // parameters: {
  //   name: string,
  //   id: string,
  //   type: string,
  //   value?: string | null | string[]
  // }[];
  // we can add loadingDashcards here
  // but by default their data will be empty, and the model will just say it can't see the data
  // so not adding it for now. helps reduce context size
}

export interface DashcardDetails {
  id: number,
  name?: string,
  description?: string | null,
  visualizationType?: string,
  data: {
    rows: (string | number | null | boolean)[][],
    cols: (string | null)[]
  }
  // TODO(@arpit): add metadata for columns? i think it has display names
}

// response type for /api/dataset metabase endpoint
export type DatasetResponse = {
  error?: string
  data: MetabaseStateTable
  status?: string
  row_count?: number
  running_time?: number
}