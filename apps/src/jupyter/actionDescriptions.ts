import { ActionDescription } from "../base/defaultState";

export const ACTION_DESCRIPTIONS_PLANNER: ActionDescription[] = [
  {
    name: "runCell",
    args: {
      cell_index: {
        type: "number",
      },
    },
    description:
      "Runs cell with index = {cell_index}. Only run if you are confident that cell has not been run before.",
  },
  {
    name: "addCodeAndRun",
    args: {
      cell_index: {
        type: "number",
        description: "The index of the cell to insert a new cell below.",
      },
      source: {
        type: "string",
        description:
          "The source code to set in the cell. If the source code is multiline, make sure to use '\\n' to separate lines.",
      },
    },
    description:
      "Inserts a cell below the cell with index = {cell_index} and sets the code to {source}. The cell is then run. New cells should not be added in the middle of the notebook unless specifically asked.",
  },
  {
    name: "replaceCodeAndRun",
    args: {
      cell_index: {
        type: "number",
        description: "The index of the cell to set the value and execute.",
      },
      source: {
        type: "string",
        description:
          "The source code to set in the cell. If the source code is multiline, make sure to use '\\n' to separate lines.",
      },
    },
    description:
      "Cell with index = {cell_index} is set to the code in {source}. The cell is then run.",
  },
  {
    name: "markTaskDone",
    args: {},
    description:
      "Marks the task as done if either the set of tool calls in the response accomplish the user's task, or if you are waiting for the user's clarification. It is not done if more tool calls are required.",
  },
  {
    name: "talkToUser",
    args: {
      content: {
        type: "string",
        description: "Text content",
      },
    },
    description:
      "Responds to the user with clarifications, questions, or summary. Keep it short and to the point. Always provide the content argument.",
    required: ["content"],
  },
  {
    name: "sendNotebookToGoogleDoc",
    args: {},
    description: "Sends the current notebook to Google Docs for further analysis. Use this tool when the user asks to create a report."
  }
];