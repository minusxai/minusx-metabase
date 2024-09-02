export const PosthogAppStateSchema = {
  type: "object",
  properties: {
    sqlQuery: {
      type: "string",
    },
    relevantTables: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          description: {
            type: "string",
          },
          schema: {
            type: "string",
          },
          id: {
            type: "number",
          },
        },
      }
    },
    sqlErrorMessage: {
      type: "string",
    }, 
    outputTableMarkdown: {
      type: "string",
    },
  },
}