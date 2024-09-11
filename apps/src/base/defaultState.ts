import { DOMQueryMap, QuerySelectorMap } from "extension/types";
import {
  DEFAULT_PLANNER_SYSTEM_PROMPT,
  DEFAULT_PLANNER_USER_PROMPT,
  DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
  DEFAULT_SUGGESTIONS_USER_PROMPT,
} from "./prompts";

type LLMSettings = {
  model: string;
  temperature: number;
  // NOTE(@arpit): conflicting documentation - the python types specify as {type: string} but official docs
  // allow `string | {type: string}` (specifically response_format="auto"). I'm going with the latter for now
  response_format: { type: "text" | "json_object" };
  tool_choice: string;
};

export type ActionDescription = {
  name: string;
  description: string;
  args: {
    [key: string]: {
      type: string;
      items?: {
        type: string;
      };
      description?: string;
      enum?: string[];
    };
  };
  required?: string[];
};

export type SimplePlannerConfig = {
  type: "simple";
  llmSettings: LLMSettings;
  systemPrompt: string;
  userPrompt: string;
  actionDescriptions: ActionDescription[];
};

export type CoTPlannerConfig = {
  type: "cot";
  thinkingStage: Omit<SimplePlannerConfig, "type">;
  toolChoiceStage: Omit<SimplePlannerConfig, "type">;
};

export type ToolPlannerConfig = SimplePlannerConfig | CoTPlannerConfig;

export interface InternalState {
  isEnabled: {
    value: boolean;
    reason: string;
  };
  llmConfigs: {
    default: ToolPlannerConfig;
    suggestions: ToolPlannerConfig
  } & Record<string, ToolPlannerConfig>;
  querySelectorMap: QuerySelectorMap;
  whitelistQuery?: DOMQueryMap
}

export const defaultInternalState: InternalState = {
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
      actionDescriptions: [],
    },
    suggestions: {
      type: "simple",
      llmSettings: {
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "text" },
        tool_choice: "required",
      },
      systemPrompt: DEFAULT_SUGGESTIONS_SYSTEM_PROMPT,
      userPrompt: DEFAULT_SUGGESTIONS_USER_PROMPT,
      actionDescriptions: [],
    },
  },
  querySelectorMap: {},
};
