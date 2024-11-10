import React from 'react';
import { ChatMessageContent } from '../../state/chat/reducer'
import { Markdown } from './Markdown';

export const ChatContent: React.FC<{content: ChatMessageContent}> = ({
  content
}) => {
  if (content.type == 'DEFAULT') {
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown content={content.text} />
      </div>
    )
  } else {
    return null
  }
}
