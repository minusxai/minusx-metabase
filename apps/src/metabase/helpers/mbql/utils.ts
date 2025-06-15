export const isMBQLPageUrl = (url: string) => {
  return url.includes('/question/notebook');
}

// Base types
type BaseType = "type/BigInteger" | "type/Text" | "type/DateTime" | string;

type JoinStrategy = "left-join" | "inner-join" | "right-join" | "full-join";

type BinningStrategy = "default" | "auto" | "custom";

// Field reference types
interface FieldOptions {
  "base-type": BaseType;
  "join-alias"?: string;
  "was-binned"?: boolean;
  binning?: {
    strategy: BinningStrategy;
  };
}

type FieldReference = [
  "field",
  string | number,
  FieldOptions?
];

// Condition types
type Condition = [
  "=" | "!=" | ">" | "<" | ">=" | "<=" | "is-null" | "not-null" | "like" | "not-like",
  FieldReference,
  FieldReference?
];

// Join configuration
interface Join {
  strategy: JoinStrategy;
  alias: string;
  condition: Condition;
  "source-table": number;
}

// Aggregation types
type AggregationType = "count" | "sum" | "avg" | "min" | "max" | "distinct";
type Aggregation = [AggregationType, FieldReference?];

// Breakout (grouping) types
type Breakout = FieldReference;

// Filter types
type Filter = Condition;

// Source query (nested query)
interface SourceQuery {
  "source-table": number;
  joins?: Join[];
  aggregation?: Aggregation[];
  breakout?: Breakout[];
  filter?: Filter;
}

interface DatabaseQuery {
  joins?: Join[];
  aggregation?: Aggregation[];
  breakout?: Breakout[];
  "source-query"?: SourceQuery;
  "source-table"?: number;
  filter?: Filter;
}


export interface MBQLInfo {
    mbqlQuery: DatabaseQuery;
}


export function getSourceTableIds(query: DatabaseQuery): number[] {
    if (!query || typeof query !== 'object') {
        return [];
    }
  const tableIds = new Set<number>();
  
  if (query["source-table"]) {
    tableIds.add(query["source-table"]);
  }
  
  if (query.joins) {
    for (const join of query.joins) {
      tableIds.add(join["source-table"]);
    }
  }
  
  if (query["source-query"]) {
    const nestedTableIds = getSourceTableIds(query["source-query"]);
    nestedTableIds.forEach(id => tableIds.add(id));
  }
  
  return Array.from(tableIds).sort((a, b) => a - b);
}