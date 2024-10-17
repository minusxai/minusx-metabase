interface FormattedColumn {
  description?: string;
  name: string;
  type: string;
  // only populated for foreign keys
  fk_table_id?: number;
  foreign_key_target?: string | null;
}
export interface FormattedTable {
  description?: string;
  name: string;
  id: number;
  schema: string;
  columns?: { [key: number]: FormattedColumn };
}

export const visualizationTypes = ["Table", "Bar", "Line", "Pie", "Row", "Area", "Combo", "Trend", "Funnel", "Detail", "Scatter", "Waterfall", "Number", "Gauge", "Progress", "Map", "PivotTable"]
export const primaryVisualizationTypes = ["Line", "Bar", "Area", "Scatter"]
export type VisualizationType = typeof visualizationTypes[number];
export type VisualizationTypeLower = Lowercase<VisualizationType>;
export function toLowerVisualizationType(type: VisualizationType): VisualizationTypeLower {
  return type.toLowerCase() as VisualizationTypeLower;
}


export interface visualizationSettings {
  "graph.dimensions": string[];
  "graph.metrics": string[];
  [key: string]: any;
}

export interface QBParameter {
  id: string,
  type: string,
  target: [
    string, // 'variable'
    [
      "template-tag",
      string // variable name
    ]
  ],
  name: string, // display name
  slug: string // also variable name
}

export type QBParameters = QBParameter[];
export interface QBTemplateTag {
  id: string,
  type: string,
  name: string,
  default?: any,
  'display-name': string,
}
export interface QBTemplateTags {
  [key: string]: QBTemplateTag
}
// qb.card
export interface Card {
  dataset_query: {
    database: number;
    type: string;
    native: {
      query: string
      'template-tags': QBTemplateTags
    }
  };
  display: VisualizationTypeLower;
  displayIsLocked: boolean;
  visualization_settings: visualizationSettings;
  type: string;
  parameters: QBParameters;
}

// qb.parameterValues

export interface ParameterValues {
  [key: string]: string;
}