import React, { useState } from 'react';
import { Suggestions } from './Suggestions';
import { SettingsBlock } from './SettingsBlock'
import { Markdown } from './Markdown';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';


const DEMO_SLUGS = [
    "/138-demo-sql",
    "/139-demo-mbql",
    "/1-e-commerce-insights"
]

const MESSAGES = [
    `Hey there! Welcome to the **MinusX SQL Demo**. Try any of the suggested questions, or ask something of your own!
  
  ---
  \`[badge]Protip: \` Click the **[Context](https://docs.minusx.ai/en/articles/11166007-default-tables)** quick action to control the tables MinusX can see!`,
    `Hey there! Welcome to the **[MinusX Question Builder Demo](https://docs.minusx.ai/en/articles/11637221-metabase-gui-question-builder)**. Try any of the suggested questions, or ask something of your own!
  
  ---
  \`[badge]Protip: \` Click the MinusX logo on the left to toggle the side panel`,
      `Hey there! Welcome to the **[MinusX Dashboard Demo](https://docs.minusx.ai/en/articles/11496071-q-a-on-dashboards)**. Try any of the suggested questions, or ask something of your own!
  
  ---
  \`[badge]Protip: \` Install MinusX on your own Metabase with a [simple Chrome Extension](https://minusx.ai/chrome-extension/)`
]

const MESSAGE_TITLES = [
    "SQL Demo",
    "MBQL Demo",
    "Dashboard Q&A"
]

const ALL_SUGGESTIONS = [
    [
        "show me monthly category wise sales but i want 2023 and 2024 in separate columns, with a col for % change",
        "bar plot this!",
    ],
    [
        "filter for this year, sort by orders",
        "pick top 15?"
    ],
    [
        "what's the total non gizmo order %?"
    ]
]

export const getDemoIDX = (url: string) => {
    return DEMO_SLUGS.findIndex(slug => url.includes(slug))
}

export const DemoHelperMessage = ({url}: {url: string}) => {
  const demoIDX = getDemoIDX(url)
    if (demoIDX === -1) {
        return null
    }

  const message = MESSAGES[demoIDX]
  return <SettingsBlock title={MESSAGE_TITLES[demoIDX]} ariaLabel="welcome-message"><Markdown content={message}/></SettingsBlock>

}

export const DemoSuggestions = ({url}: {url: string}) => {
    const thread = useSelector((state: RootState) => state.chat.activeThread)
    const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
    const taskInProgress = !(activeThread.status == 'FINISHED')

    const [clickedSuggestions, setClickedSuggestions] = useState<Set<string>>(new Set())
    const demoIDX = getDemoIDX(url)
    if (demoIDX === -1) {
        return null
    }

    const suggestions = ALL_SUGGESTIONS[demoIDX] || []
    
    const handleSuggestionClick = (suggestion: string) => {
        setClickedSuggestions(prev => new Set([...prev, suggestion]))
    }
    
    const visibleSuggestions = suggestions.filter(suggestion => !clickedSuggestions.has(suggestion))
    
    if (visibleSuggestions.length === 0) {
        return null
    }
    if (taskInProgress) {
        return null
    }
    
    return <Suggestions title={"Try These Questions!"} suggestions={visibleSuggestions} onSuggestionClick={handleSuggestionClick} />
}
