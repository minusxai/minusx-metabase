import { ActionDescription } from "../base/defaultState";
import { visualizationTypes } from "./helpers/querySelectorMap";

export const COMMON_ACTION_DESCRIPTIONS: ActionDescription[] = [
  {
    name: 'markTaskDone',
    args: {},
    description: 'Marks the task as done. This tool should be called when the task is completed.',
  },
  {
    name: 'talkToUser',
    args: {
      content: {
        type: 'string',
        description: "The content to respond to the user with in a chat message."
      }
    },
    description: 'Responds to the user query in a text format. Use this tool in case the user asks a clarification question or description of something on their screen.',
  },
]

export const ACTION_DESCRIPTIONS_PLANNER: ActionDescription[] = [
  ...COMMON_ACTION_DESCRIPTIONS,
  {
    name: 'updateSQLQueryAndExecute',
    args: {
      sql: {
        type: 'string',
        description: "The SQL query to update in the metabase SQL editor."
      },
    },
    description: `Updates the SQL Query in a metabase SQL editor and executes it. This also sets the "queryExecuted" state to true after execution.
    Make sure you know the column names for the tables you are using. If you don't know the column names, use the getTableSchemasById tool to get the column names and other information about tables.
    `,
  },
  {
    name: 'setVisualizationType',
    args: {
      visualization_type: {
        type: 'string',
        enum: visualizationTypes,
        description: "The type of visualization to set in the visualization settings."
      }
    },
    description: 'Sets the visualization type in the visualization settings. "queryExecuted" state must be true to use this tool.',
  },
  {
    name: 'getTableSchemasById',
    args: {
      ids: {
        type: 'array',
        items: {
          type: 'number'
        },
        description: "The ids of the tables to get the schemas for."
      }
    },
    description: 'Gets the schemas of the specified tables by their ids in the database. Can pass multiple ids to get multiple tables in a single call.',
  },
  {
    name: 'searchTableSchemas',
    args: {
      query: {
        type: 'string',
        description: "The query to search for in the database."
      }
    },
    description: 'Searches for the specified query and finds the relevant tables in the database.',
  },
  {
    name: 'searchPreviousSQLQueries',
    args: {
      words: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: "Array of words to search to search previous SQL queries."
      }
    },
    description: 'Searches for previous SQL queries using the specified words.',
  },
  {
    name: 'selectDatabase',
    args: {
      database: {
        type: 'string',
        description: "The name of the database to select."
      }
    },
    description: 'Selects the specified database. Use this tool if user asks to select a database or there is no database selected. ALWAYS confirm with the user before using this tool.',
  }
];

export const ACTION_DESCRIPTIONS_DASHBOARD: ActionDescription[] = [
  ...COMMON_ACTION_DESCRIPTIONS,
  {
    name: 'getDashcardDetailsById',
    args: {
      ids: {
        type: 'array',
        items: {
          type: 'number'
        },
        description: "The ids of the dashcards to get the information for."
      }
    },
    description: 'Gets more detailed information about the specified dashcards, including the visualization type, the query, and the data displayed. Can pass multiple ids to get multiple dashcards.',
  }
];
