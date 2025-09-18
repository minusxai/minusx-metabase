import React, { useState } from 'react';
import { Suggestions } from './Suggestions';
import { SettingsBlock } from './SettingsBlock'
import { Markdown } from './Markdown';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getApp } from '../../helpers/app';


const useAppStore = getApp().useStore()

export const DemoHelperMessage = ({url}: {url: string}) => {
  const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
  const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
  const useTeamMemory = useSelector((state: RootState) => state.settings.useTeamMemory)
  const selectedAsset = availableAssets.find(asset => asset.slug === selectedAssetId) || 
                            (availableAssets.length > 0 ? availableAssets[0] : null)

  const teamHelperMessage = (selectedAsset && useTeamMemory && selectedAsset.content?.isActive) ? selectedAsset.content?.helpertexts?.filter(text => url.includes(new URL(text.url).pathname) && text.is_published).map(t => t.text)?.[0] : null

  const helperMessage = useAppStore((state) => state.helperMessage)
  if (!helperMessage && !teamHelperMessage) {
    return null
  }
  return <SettingsBlock title={"Welcome"} ariaLabel="welcome-message"><Markdown content={teamHelperMessage || helperMessage}/></SettingsBlock>

}

export const DemoSuggestions = ({url}: {url: string}) => {
    const thread = useSelector((state: RootState) => state.chat.activeThread)
    const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
    const taskInProgress = !(activeThread.status == 'FINISHED')
    const savedQuestions = useSelector((state: RootState) => state.settings.savedQuestions)
    const showSavedQuestions = useSelector((state: RootState) => state.settings.suggestQueries)
    const availableAssets = useSelector((state: RootState) => state.settings.availableAssets)
    const selectedAssetId = useSelector((state: RootState) => state.settings.selectedAssetId)
    const useTeamMemory = useSelector((state: RootState) => state.settings.useTeamMemory)
    const selectedAsset = availableAssets.find(asset => asset.slug === selectedAssetId) || 
                         (availableAssets.length > 0 ? availableAssets[0] : null)

    const personalQuestions = showSavedQuestions ? savedQuestions : []
    const teamQuestions = (selectedAsset && useTeamMemory && selectedAsset.content?.isActive) ? selectedAsset.content?.questions?.filter(q => q.is_published && url.includes(new URL(q.source_url).pathname)).map(q => q.content) : []
    const allQuestions = [...personalQuestions, ...teamQuestions]
        


    const [clickedSuggestions, setClickedSuggestions] = useState<Set<string>>(new Set())
    
    const handleSuggestionClick = (suggestion: string) => {
        setClickedSuggestions(prev => new Set([...prev, suggestion]))
    }
    
    const visibleSuggestions = allQuestions.filter(suggestion => !clickedSuggestions.has(suggestion))
    
    if (visibleSuggestions.length === 0) {
        return null
    }
    if (taskInProgress) {
        return null
    }
    
    return <Suggestions title={"Try These Questions!"} suggestions={visibleSuggestions} onSuggestionClick={handleSuggestionClick} />
}
