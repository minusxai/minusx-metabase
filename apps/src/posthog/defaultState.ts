import { InternalState } from "../base/defaultState";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT,
  DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
  DEFAULT_SUGGESTIONS_USER_PROMPT,
} from "./prompts";
import { ACTION_DESCRIPTIONS } from "./actionDescriptions";
import { querySelectorMap } from "./querySelectorMap";

export const posthogInternalState: InternalState = {
  isEnabled: {
    value: true,
    reason: "",
  },
  llmConfigs: {
    default: {
      type: "simple",
      llmSettings: {
        model: "gpt-4.1",
        temperature: 0,
        response_format: { type: "text" },
        tool_choice: "required",
      },
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      userPrompt: DEFAULT_USER_PROMPT,
      actionDescriptions: ACTION_DESCRIPTIONS,
    },
    suggestions: {
      type: "simple",
      llmSettings: {
        model: "gpt-4.1-mini",
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
  },
  querySelectorMap,
  whitelistQuery: {
    editor: {
      selector: querySelectorMap["hogql_query"],
      attrs: ["class"],
    },
  },
};