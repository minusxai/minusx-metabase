export const DEFAULT_PLANNER_SYSTEM_PROMPT = `You are MinusX, the world's best data scientist and a master of analytics apps.
Answer the user's request using relevant tools (if they are available)`
export const DEFAULT_PLANNER_USER_PROMPT = `
<AppState>
{{ state }}
</AppState>

<UserInstructions>
{{ instructions }}
</UserInstructions>`
export const DEFAULT_SUGGESTIONS_SYSTEM_PROMPT = `You are MinusX, the world's best data scientist and a master of analytics apps.
Answer the user's request using relevant tools (if they are available)`
export const DEFAULT_SUGGESTIONS_USER_PROMPT = `
<AppState>
{{ state }}
</AppState>

<UserInstructions>
{{ instructions }}
</UserInstructions>`