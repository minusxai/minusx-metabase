import React from 'react';
import { useSelector } from 'react-redux';
import { ChatMessageContent } from '../../state/chat/reducer'
import { Markdown } from './Markdown';
import { processModelToUIText } from '../../helpers/utils';
import { getApp } from '../../helpers/app';
import { RootState } from '../../state/store';
import { getOrigin, getParsedIframeInfo } from '../../helpers/origin';


const useAppStore = getApp().useStore()

export const ChatContent: React.FC<{content: ChatMessageContent, messageIndex?: number, role?: string}> = ({
  content,
  messageIndex,
  role
}) => {
  const url = useAppStore((state) => state.toolContext)?.url || ''
  const origin = url ? new URL(url).origin : '';
  const pageType = useAppStore((state) => state.toolContext)?.pageType || ''
  const embedConfigs = useSelector((state: RootState) => state.configs.embed);
  
  if (content.type == 'DEFAULT') {
    const contentText = ((pageType === 'dashboard' || pageType === 'unknown') && role === 'assistant') ? `${content.text} {{MX_LAST_QUERY_URL}}` : content.text;
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown content={processModelToUIText(contentText, origin, embedConfigs)} messageIndex={messageIndex} />
      </div>
    )
  } else {
    return null
  }
}
