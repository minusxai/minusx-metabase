import { InternalState } from "../base/defaultState";
import {
  ACTION_DESCRIPTIONS_DASHBOARD,
  ACTION_DESCRIPTIONS_PLANNER,
  ACTION_DESCRIPTIONS_SEMANTIC_QUERY
} from "./actionDescriptions";
import { DatabaseInfoWithTables } from "./helpers/getDatabaseSchema";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { FormattedTable } from "./helpers/types";

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

export const DB_INFO_DEFAULT: DatabaseInfoWithTables = {
  name: '',
  description: '',
  id: 0,
  dialect: '',
  dbms_version: {
    flavor: '',
    version: '',
    semantic_version: []
  },
  tables: []
}

export interface MetabaseContext {
  dbId?: number;
  relevantTables: FormattedTable[]
  dbInfo: DatabaseInfoWithTables
  loading: boolean
}

interface MetabaseInternalState extends InternalState {
  toolContext: MetabaseContext
}

export const metabaseInternalState: MetabaseInternalState = {
  isEnabled: {
    value: false,
    reason: "Loading...",
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
      systemPrompt: DEFAULT_PLANNER_SYSTEM_PROMPT,
      userPrompt: DEFAULT_PLANNER_USER_PROMPT,
      actionDescriptions: ACTION_DESCRIPTIONS_PLANNER,
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
    dashboard: {
      type: "simple",
      llmSettings: {
        model: "gpt-4.1",
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
        model: "gpt-4.1",
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
  toolContext: {
    relevantTables: [],
    dbInfo: DB_INFO_DEFAULT,
    loading: true,
  },
  helperMessage: `Here's the [docs](https://docs.minusx.ai/en/collections/10790008-minusx-in-metabase) to get you started.  

\`NEW: \` MinusX can now: 
1. auto-magically create **data models** from your dashboards
2. support data requests in **Slack** 
3. perform factual **Deep Research** on your data
  
[Schedule a Demo](https://minusx.ai/demo) to learn more!`,
};
