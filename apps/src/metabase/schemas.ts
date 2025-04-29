// TODO(@arpit): this is completely made up. Need to add real schema
export const MetabaseStateSchema = {
  "type": "object",
  "description": "The state of a metabase application",
  "properties": {
    "selectedDatabaseInfo": {
      "type": "object",
      "description": "Database info",
      "properties": {
        "name": {
          "type": "string",
          "description": "Name of the database"
        },
        "description": {
          "type": "string",
          "description": "Description of the database"
        },
        "id": {
          "type": "number",
          "description": "ID of the database"
        },
        "dialect": {
          "type": "string",
          "description": "Dialect of the database"
        },
        "dbms_version": {
          "type": "object",
          "description": "Version of the database",
          "properties": {
            "flavor": {
              "type": "string",
              "description": "Flavor of the database"
            },
            "version": {
              "type": "string",
              "description": "Version of the database"
            },
            "semantic_version": {
              "type": "array",
              "description": "Semantic version of the database",
              "items": { "type": "number" }
            }
          }
        },
      }
    },
    "relevantTables": {
      "type": "array",
      "description": "Relevant tables in the database",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the table"
          },
          "description": {
            "type": "string",
            "description": "Description of the table"
          },
          "schema": {
            "type": "string",
            "description": "Schema of the table"
          },
          "id": {
            "type": "number",
            "description": "ID of the table"
          },
        }
      },
    },
    "sqlQuery": {
      "type": "string",
      "description": "The SQL query in the editor",
    },
    "queryExecuted": {
      "type": "boolean",
      "description": "Whether the query has been executed or not"
    },
    "sqlEditorState": {
      "type": "string",
      "description": "The state of the SQL editor",
      "enum": ["open", "closed", "unknown"]
    },
    "visualizationType": {
      "type": "string",
      "description": "The type of visualization"
    },
    "visualizationSettingsStatus": {
      "type": "string",
      "description": "The status of the visualization settings",
      "enum": ["open", "closed"]
    },
    "visualizationSettings": {
      "type": "object",
      "description": "The settings of the visualization",
      "properties": {
        "graph.dimensions": {
          "type": "array",
          "description": "The dimensions of the graph",
          "items": { "type": "string" }
        },
        "graph.metrics": {
          "type": "array",
          "description": "The metrics of the graph",
          "items": { "type": "string" }
        }
      }
    },
    "sqlErrorMessage": {
      "type": "string",
      "description": "The error message if any"
    },
    "outputTableMarkdown": {
      "type": "string",
      "description": "The output table in markdown format"
    }
  },
  "required": ["pageType", "sqlQuery", "queryExecuted", "sqlEditorState", "visualizationType", "visualizationSettingsStatus", "visualizationSettings"]
}

export const DashboardInfoSchema = {
  "type": "object",
  "description": "The state of a metabase dashboard",
  "properties": {
    "id": {
      "type": "number",
      "description": "ID of the dashboard"
    },
    "name": {
      "type": "string",
      "description": "Name of the dashboard"
    },
    "description": {
      "type": "string",
      "description": "Description of the dashboard"
    },
    "selectedTabId": {
      "type": "number",
      "description": "ID of the selected tab"
    },
    "tabs": {
      "type": "array",
      "description": "Tabs in the dashboard",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "number",
            "description": "ID of the tab"
          },
          "name": {
            "type": "string",
            "description": "Name of the tab"
          },
        }
      }
    },
    "cards": {
      "type": "array",
      "description": "Currently visible dashcards in the dashboard on the selected tab",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "number",
            "description": "ID of the card"
          },
          "name": {
            "type": "string",
            "description": "Name of the card"
          },
          "description": {
            "type": "string",
            "description": "Description of the card"
          },
          "visualizationType": {
            "type": "string",
            "description": "Type of the visualization"
          },
        }
      }
    },
    "parameters": {
      "type": "array",
      "description": "Parameters applied to the dashboard",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the parameter"
          },
          "id": {
            "type": "string",
            "description": "ID of the parameter"
          },
          "type": {
            "type": "string",
            "description": "Type of the parameter"
          },
          "value": {
            "type": "string",
            "description": "Value of the parameter"
          },
        }
      }
    }
  }
}

export const DashcardDetailsSchema = {
  "type": "object",
  "description": "The details of a metabase dashboard card",
  "properties": {
    "id": {
      "type": "number",
      "description": "ID of the card"
    },
    "name": {
      "type": "string",
      "description": "Name of the card"
    },
    "description": {
      "type": "string",
      "description": "Description of the card"
    },
    "visualizationType": {
      "type": "string",
      "description": "Type of the visualization"
    },
    "data": {
      "type": "object",
      "description": "Data of the card",
      "properties": {
        "rows": {
          "type": "array",
          "description": "Rows of the data",
          "items": {
            "type": "array",
            "description": "Row of the data",
            "items": {
              "type": "string"
            }
          }
        },
        "cols": {
          "type": "array",
          "description": "Columns of the data",
          "items": {
            "type": "string"
          }
        }
      } 
    },
  }
}