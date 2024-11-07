import React from 'react';
import { ChatMessageContent } from '../../state/chat/reducer'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ChatContent.css'

function LinkRenderer(props: any) {
  return (
    <a href={props.href} target="_blank" rel="minusxapp">
      <u>{props.children}</u>
    </a>
  );
}

function ModifiedParagraph(props: any) {
  return (
    <p style={{margin: '0px 5px'}}>{props.children}</p>
  )
}

function ModifiedUL(props: any) {
  return (
    <ul style={{padding: '0px 25px'}}>{props.children}</ul>
  )
}

export const ChatContent: React.FC<{content: ChatMessageContent}> = ({
  content
}) => {
  if (content.type == 'DEFAULT') {
    return (
      <div>
        {content.images.map(image => (
          <img src={image.url} key={image.url} />
        ))}
        <Markdown remarkPlugins={[remarkGfm]} className={"markdown"} components={{ a: LinkRenderer, p: ModifiedParagraph, ul: ModifiedUL}}>
          {content.text}
        </Markdown>
      </div>
    )
  } else {
    return null
  }
}
