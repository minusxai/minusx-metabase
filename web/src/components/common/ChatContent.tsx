import React from 'react';
import { ChatMessageContent } from '../../state/chat/reducer'
import { Markdown } from './Markdown';
import { processModelToUIText } from '../../helpers/utils';
import { getApp } from '../../helpers/app';


const useAppStore = getApp().useStore()

export const ChatContent: React.FC<{content: ChatMessageContent, messageIndex?: number, role?: string}> = ({
  content,
  messageIndex,
  role
}) => {
  const url = useAppStore((state) => state.toolContext)?.url || ''
  const pageType = useAppStore((state) => state.toolContext)?.pageType || ''
  if (content.type == 'DEFAULT') {
    const contentText = (pageType === 'dashboard' && role === 'assistant') ? `${content.text} {{MX_LAST_SQL_URL}}` : content.text;
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown content={processModelToUIText(contentText, url)} messageIndex={messageIndex} />
      </div>
    )
  } else {
    return null
  }
}
