type JoinType = "LEFT" | "INNER" | "RIGHT" | "FULL";

interface EntityJoin {
  entity: string;
  on: string;
  join_type?: JoinType;
}

interface Dimension {
  name: string;
  type: string;
  description?: string;
  sql?: string;
}

interface Metric {
  name: string;
  sql: string;
  description?: string;
}

interface From_ {
  sql: string;
  alias: string;
}

interface Entity {
  name: string;
  description?: string;
  from_?: From_ | string;
  schema?: string;
  joins?: EntityJoin[];
  dimensions?: Dimension[];
  metrics?: Metric[];
}

interface DataModel {
  entities: Entity[];
}

interface Column {
  name: string;
  type: string;
  description?: string;
}

interface Table {
  name: string;
  schema?: string;
  columns: Column[];
  description?: string;
  metrics?: Metric[];
}

interface Schema {
  tables: Table[];
}

export const dataModelSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "DataModel",
  type: "object",
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          schema: { type: "string" },
          from_: {
            anyOf: [
              { type: "string" },
              {
                type: "object",
                properties: {
                  sql: { type: "string" },
                  alias: { type: "string" }
                },
                required: ["sql", "alias"]
              }
            ]
          },
          joins: {
            type: "array",
            items: {
              type: "object",
              properties: {
                entity: { type: "string" },
                on: { type: "string" },
                join_type: {
                  type: "string",
                  enum: ["LEFT", "INNER", "RIGHT", "FULL"],
                  default: "LEFT"
                }
              },
              required: ["entity", "on"]
            }
          },
          dimensions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                description: { type: "string" },
                sql: { type: "string" }
              },
              required: ["name", "type"]
            }
          },
          metrics: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sql: { type: "string" },
                description: { type: "string" }
              },
              required: ["name", "sql"]
            }
          }
        },
        required: ["name"]
      }
    }
  },
  required: ["entities"]
};

export function createSchemaFromDataModel(dataModel: DataModel): Schema {
  const tables: Table[] = dataModel.entities.map((entity) => {
    const columns: Column[] = (entity.dimensions || []).map((dim) => ({
      name: dim.name,
      type: dim.type,
      description: dim.description,
    }));

    const metrics: Metric[] = entity.metrics || [];

    return {
      name: entity.name,
      schema: entity.schema,
      description: entity.description,
      columns,
      metrics,
    };
  });

  return { tables };
}
