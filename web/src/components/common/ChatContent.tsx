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
  const cards = toolContext?.dbInfo?.cards || []

  // Get messages to check if next message exists
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const messages = useSelector((state: RootState) => state.chat.threads[thread].messages)

  // Create mention items for parsing storage format mentions
  const mentionItems = useMemo(() => {
    if (!toolContext?.dbInfo) return []
    const tables = toolContext.dbInfo.tables || []
    const models = toolContext.dbInfo.models || []
    return createMentionItems(tables, models)
  }, [toolContext?.dbInfo]);

  if (content.type == 'DEFAULT') {
    // Check if next message exists and if it's a user message
    const nextMessage = messageIndex !== undefined ? messages[messageIndex + 1] : undefined
    const shouldAddQueryURL = (
      (pageType === 'dashboard' || pageType === 'unknown') &&
      role === 'assistant' &&
      (!nextMessage || nextMessage.role === 'user')
    )
    const baseContentText = shouldAddQueryURL ? `${content.text} {{MX_LAST_QUERY_URL}}` : content.text;
    // Convert storage format mentions (@{type:table,id:123}) to special code syntax ([mention:table:table_name])
    const contentTextWithMentionTags = convertMentionsToDisplay(baseContentText, mentionItems);
    if (contentTextWithMentionTags.trim() === '') {
      return null;
    }
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown content={processModelToUIText(contentTextWithMentionTags, origin, embedConfigs, cards)} messageIndex={messageIndex} />
      </div>
    )
  } else {
    return null
  }
}
