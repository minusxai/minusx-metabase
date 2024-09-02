// this is the shape of the .dashboard key from sample-metabase-state.json
// actually only a subset of it that i care about
export interface DashboardMetabaseState {
  dashboardId: number;
  loadingControls?: {
    documentTitle: string;
    showLoadCompleteFavicon: boolean;
  };
  selectedTabId: number | null;
  dashboards?: {
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
      parameters: {
        name: string;
        slug: string;
        id: string;
        type: string;
        sectionId?: string;
        default?: string;
      }[];
    };
  };
  dashcards: {
    [key: number]: {
      dashboard_tab_id?: number;
      id: number;
      card: {
        // this is the card id, not the dashcard id! commenting out to avoid confusion and misuse
        // id: number;
        description: string | null;
        result_metadata: {
          display_name: string;
          base_type: string;
        }[];
        name: string;
        display: string;
        // not keeping this because even metabase code uses {[key: string]: unknown} for visualization_settings lol
        // visualization_settings: {};
      },
      size_x: number;
      size_y: number;
      row: number;
      col: number;
    }
  },
  dashcardData: {
    // this is dashcard id
    [key: number]: {
      // this is card id
      [key: number]: {
        data: {
          rows: (string | number | null | boolean)[][],
          cols: {
            display_name: string;
            effective_type: string;
          }[]
        }
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
  description?: string | null,
  visualizationType?: string
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
  visibleDashcards: DashcardInfo[]
  parameters: {
    name: string,
    id: string,
    type: string,
    value?: string | null
  }[];
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