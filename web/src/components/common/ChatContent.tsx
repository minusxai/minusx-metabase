import React from 'react';
import { ChatMessageContent } from '../../state/chat/reducer'
import { Markdown } from './Markdown';
import { processModelToUIText } from '../../helpers/utils';
import { getApp } from '../../helpers/app';


const useAppStore = getApp().useStore()

export const ChatContent: React.FC<{content: ChatMessageContent, messageIndex?: number}> = ({
  content,
  messageIndex
}) => {
  const url = useAppStore((state) => state.toolContext)?.url || ''
  if (content.type == 'DEFAULT') {
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown content={processModelToUIText(content.text, url)} messageIndex={messageIndex} />
      </div>
    )
  } else {
    return null
  }
}
