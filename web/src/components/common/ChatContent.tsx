import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ChatMessageContent } from '../../state/chat/reducer'
import { Markdown } from './Markdown';
import { processModelToUIText } from '../../helpers/utils';
import { getApp } from '../../helpers/app';
import { RootState } from '../../state/store';
import { getOrigin, getParsedIframeInfo } from '../../helpers/origin';
import { createMentionItems, convertMentionsToDisplay } from '../../helpers/mentionUtils';
import { MetabaseContext } from 'apps/types';


const useAppStore = getApp().useStore()

export const ChatContent: React.FC<{content: ChatMessageContent, messageIndex?: number, role?: string}> = ({
  content,
  messageIndex,
  role
}) => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const url = toolContext?.url || ''
  const origin = url ? new URL(url).origin : '';
  const pageType = toolContext?.pageType || ''
  const embedConfigs = useSelector((state: RootState) => state.configs.embed);
  
  // Create mention items for parsing storage format mentions
  const mentionItems = useMemo(() => {
    if (!toolContext?.dbInfo) return []
    const tables = toolContext.dbInfo.tables || []
    const models = toolContext.dbInfo.models || []
    return createMentionItems(tables, models)
  }, [toolContext?.dbInfo]);
  
  if (content.type == 'DEFAULT') {
    const baseContentText = ((pageType === 'dashboard' || pageType === 'unknown') && role === 'assistant') ? `${content.text} {{MX_LAST_QUERY_URL}}` : content.text;
    // Convert storage format mentions (@{type:table,id:123}) to special code syntax ([mention:table:table_name])
    const contentTextWithMentionTags = convertMentionsToDisplay(baseContentText, mentionItems);
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown content={processModelToUIText(contentTextWithMentionTags, origin, embedConfigs)} messageIndex={messageIndex} />
      </div>
    )
  } else {
    return null
  }
}
