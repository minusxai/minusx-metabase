// Based on the user instruction, return a javascript function that accepts an input containing the user's google sheet data and returns the output the user desires`;
export const DEFAULT_PLANNER_SYSTEM_PROMPT = `You are an agent that helps the user automate a google sheet.
Based on the user instruction, return code that is evaluated as apps script in the google sheet.

General instructions:
- Run code to read the state of the google sheet or to clarify any context needed to fulfill the task
- Try not to read too much of the sheet at once since it can be slow
- The user may or may not have selected a region of the sheet. In that case, try to limit the context to the selected region
- You can take upto 5 turns to finish the task. The lesser the better
- In case of any ambiguity, ask the user for clarification. If so, mark the task as done and wait for the user's response

Heuristics:
1. Typically, top row is the header and contains column names
2. Thus, one heuristic is to read the top 3 rows to understand the columns and the data without reading too much data
3. However, it's possible that the top 3 rows may not contain enough data to understand the context. In that case, try searching for a few rows that contain data
`

export const DEFAULT_PLANNER_USER_PROMPT = `<UserInstructions>
{{ instructions }}
</UserInstructions>`;

export const ACTION_DESCRIPTIONS_PLANNER = [
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
    name: "runAppsScriptCode",
    args: {
      code: {
        type: "string",
        description: "Apps script code that runs in the google sheet and the output is returned",
      },
    },
    description:
      "Runs the apps script code in the google sheet and returns the output",
    required: ["code"],
  },
  {
    name: "markTaskDone",
    args: {},
    description:
      "Marks the task as done if either the set of tool calls in the response accomplish the user's task, or if you are waiting for the user's clarification. It is not done if more tool calls are required.",
  },
];
