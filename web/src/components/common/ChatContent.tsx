import React from 'react';
import { ChatMessageContent } from '../../state/chat/reducer'
import Markdown from 'react-markdown'

export const ChatContent: React.FC<{content: ChatMessageContent}> = ({
  content
}) => {
  if (content.type == 'DEFAULT' || content.type == 'LUCKY') {
    return (
      <div style={content.type == 'LUCKY'? {color: 'red'}: {}}>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown>
          {content.text}
        </Markdown>
      </div>
    )
  } else {
    return null
  }
}
