import { InternalState } from "../base/defaultState";
import {
  ACTION_DESCRIPTIONS_DASHBOARD,
  ACTION_DESCRIPTIONS_PLANNER,
  ACTION_DESCRIPTIONS_SEMANTIC_QUERY
} from "./actionDescriptions";
import { querySelectorMap } from "./helpers/querySelectorMap";

import {
  DASHBOARD_PLANNER_SYSTEM_PROMPT,
  DASHBOARD_PLANNER_USER_PROMPT,
  DEFAULT_PLANNER_SYSTEM_PROMPT,
  DEFAULT_PLANNER_USER_PROMPT,
  DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
  DEFAULT_SUGGESTIONS_USER_PROMPT,
  SEMANTIC_QUERY_SYSTEM_PROMPT,
  SEMANTIC_QUERY_USER_PROMPT
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
    semanticQuery: {
      type: "simple",
      llmSettings: {
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "text" },
        tool_choice: "required",
      },
      systemPrompt: SEMANTIC_QUERY_SYSTEM_PROMPT,
      userPrompt: SEMANTIC_QUERY_USER_PROMPT,
      actionDescriptions: ACTION_DESCRIPTIONS_SEMANTIC_QUERY,
    }
  },
  querySelectorMap,
  whitelistQuery: {
    editor: {
      selector: querySelectorMap["query_editor"],
      attrs: ["class"],
    },
  },
  helperMessage: `Here's a [user manual](https://docs.minusx.ai/en/collections/10790008-minusx-in-metabase) to get you started.

  **tl;dr:** MinusX has 3 modes:
1. [Basic Mode](https://docs.minusx.ai/en/articles/10488431-basic-mode): Best-effort answers based on common tables and historical queries.
2. [Custom Mode](https://docs.minusx.ai/en/articles/10489277-custom-mode): Queries based on custom instructions (about tables, joins, custom fields, etc.).
3. [Advanced Mode](https://docs.minusx.ai/en/articles/10489378-advanced-mode): Automated data modeling that drastically reduces query complexity and length.

You're all set! Feel free to contact support in case of any questions.`,
};
