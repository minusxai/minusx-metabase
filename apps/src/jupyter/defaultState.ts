import { InternalState } from "../base/defaultState";
import { ACTION_DESCRIPTIONS_PLANNER } from "./actionDescriptions";
import {
  DEFAULT_PLANNER_SYSTEM_PROMPT,
  DEFAULT_PLANNER_USER_PROMPT,
  DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
  DEFAULT_SUGGESTIONS_USER_PROMPT,
} from "./prompts";
import { querySelectorMap } from './helpers/querySelectorMap';
import { NB_TO_MD_REPORT_LLM_CONFIG } from "./nb-to-md-report/llmConfig";
import { ToolPlannerConfig } from "../base/defaultState";

export const jupyterInternalState: InternalState = {
  isEnabled: {
    value: true,
    reason: "",
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
    nbToMd: NB_TO_MD_REPORT_LLM_CONFIG as ToolPlannerConfig,
  },
  querySelectorMap,
};