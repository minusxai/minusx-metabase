import { NB_TO_MD_REPORT_SYSTEM_PROMPT, NB_TO_MD_REPORT_USER_PROMPT } from "./prompts";

export const NB_TO_MD_REPORT_LLM_CONFIG = {
  type: "simple",
  llmSettings: {
    model: "gpt-4o",
    temperature: 0,
    response_format: {
      type: "text",
    },
    tool_choice: "none",
  },
  systemPrompt: NB_TO_MD_REPORT_SYSTEM_PROMPT,
  userPrompt: NB_TO_MD_REPORT_USER_PROMPT,
  actionDescriptions: [],
};