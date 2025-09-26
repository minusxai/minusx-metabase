import { InternalState } from "../base/defaultState";
import {
  ACTION_DESCRIPTIONS_DASHBOARD,
  ACTION_DESCRIPTIONS_PLANNER,
  ACTION_DESCRIPTIONS_SEMANTIC_QUERY
} from "./actionDescriptions";
import { DatabaseInfoWithTablesAndModels } from "./helpers/metabaseAPITypes";
import { querySelectorMap } from "./helpers/querySelectorMap";
import { FormattedTable } from "./helpers/types";
import { MetabasePageType } from "./helpers/utils";

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

export const DB_INFO_DEFAULT: DatabaseInfoWithTablesAndModels = {
  name: '',
  description: '',
  id: 0,
  dialect: '',
  dbms_version: {
    flavor: '',
    version: '',
    semantic_version: []
  },
  tables: [],
  models: []
}

export interface MinifiedDB {
    id: number;
    name: string;
}

export interface MetabaseContext {
  pageType: MetabasePageType
  dbId?: number;
  relevantTables: FormattedTable[]
  dbInfo: DatabaseInfoWithTablesAndModels
  loading: boolean,
  allDBs?: MinifiedDB[]
}

interface MetabaseInternalState extends InternalState {
  toolContext: MetabaseContext
}

export const metabaseInternalState: MetabaseInternalState = {
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
    selected_database: {
      selector: querySelectorMap["selected_database"],
    },
    editor: {
      selector: querySelectorMap["query_editor"],
      attrs: ["class"],
    },
    dashcard: {
      selector: querySelectorMap["dashcard"],
      // attrs: ["class"],
    },
    mbql: {
        selector: querySelectorMap["show_mbql_editor"],
        attrs: ["class"],
    },
    mbql_embedded: {
        selector: querySelectorMap["show_mbql_editor_embedded"],
        attrs: ["class"],
    },
    mbql_parent: {
        selector: querySelectorMap["mbql_run_parent"],
    }
  },
  toolContext: {
    pageType: 'sql',
    relevantTables: [],
    dbInfo: DB_INFO_DEFAULT,
    loading: true,
  },
  helperMessage: `To get started, simply ask: 
> **What are some interesting questions I can ask about my data?**

---

\`[badge]✨Product Update✨\` \n#### Launching: **Mentions**
Mention specific tables and models for MinusX to focus on. Type "@" to see all entities. [[Read more](https://docs.minusx.ai/en/articles/12429148-mentions-table-model)]

[![img](https://minusx.ai/app_assets/mentions.gif)](https://docs.minusx.ai/en/articles/12429148-mentions-table-model)
`,
};
