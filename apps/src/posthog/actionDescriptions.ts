import { ActionDescription } from "../base/defaultState";


export const ACTION_DESCRIPTIONS: ActionDescription[] = [
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
  {
    name: 'updateHogQLQueryAndExecute',
    args: {
      query: {
        type: 'string',
        description: "The HogQL query to update in the Posthog HogQL editor."
      },
    },
    description: 'Updates the HogQL query in the Posthog HogQL editor and executes it.',
  },
  {
    name: 'getTableSchemasById',
    args: {
      ids: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: "The ids of the tables to get the schemas for."
      }
    },
    description: 'Gets the schemas of the specified tables by their ids in the database.',
  },
  {
    name: "getHogQLExpressionsDocumentation",
    args: {},
    description: "Gets the documentation for HogQL expressions. Use this tool if you need help with writing HogQL.",
  },
];
