import { InternalState } from "../base/defaultState";
import {
  ACTION_DESCRIPTIONS_DASHBOARD,
  ACTION_DESCRIPTIONS_PLANNER
} from "./actionDescriptions";
import { querySelectorMap } from "./helpers/querySelectorMap";

import {
  DASHBOARD_PLANNER_SYSTEM_PROMPT,
  DASHBOARD_PLANNER_USER_PROMPT,
  DEFAULT_PLANNER_SYSTEM_PROMPT,
  DEFAULT_PLANNER_USER_PROMPT,
  DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
  DEFAULT_SUGGESTIONS_USER_PROMPT,
} from "./prompts";

export const metabaseInternalState: InternalState = {
  isEnabled: {
    value: false,
    reason: "Loading...",
  },
  llmConfigs: {
    default: {
      type: "simple",
      llmSettings: {
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "text" },
        tool_choice: "required",
      },
      systemPrompt: DEFAULT_PLANNER_SYSTEM_PROMPT,
      userPrompt: DEFAULT_PLANNER_USER_PROMPT,
      actionDescriptions: ACTION_DESCRIPTIONS_PLANNER,
    },
    suggestions: {
      type: "simple",
      llmSettings: {
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: {
          type: "json_object",
        },
        tool_choice: "none",
      },
      systemPrompt: DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
      userPrompt: DEFAULT_SUGGESTIONS_USER_PROMPT,
      actionDescriptions: [],
    },
    dashboard: {
      type: "simple",
      llmSettings: {
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "text" },
        tool_choice: "required",
      },
      systemPrompt: DASHBOARD_PLANNER_SYSTEM_PROMPT,
      userPrompt: DASHBOARD_PLANNER_USER_PROMPT,
      actionDescriptions: ACTION_DESCRIPTIONS_DASHBOARD,
    },
  },
  querySelectorMap,
  whitelistQuery: {
    editor: {
      selector: querySelectorMap["query_editor"],
      attrs: ["class"],
    },
  },
//   helperMessage: `### Hello, welcome to MinusX!
// Here's a quick MinusX manual to get you started:
// 1. MinusX works best when you provide a clear prompt with the table name you're interested in.
// 2. If you do not provide the table name, tell MinusX to figure out the correct table.

// That's it. You're all set! For more info, you can check our [FAQ](https://docs.minusx.ai/en/collections/10790008-minusx-in-metabase).`,
};
