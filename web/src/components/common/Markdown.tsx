import React, { useEffect, useState } from 'react';
import MarkdownComponent from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ChatContent.css'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Image } from "@chakra-ui/react"
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { renderString } from '../../helpers/templatize'
import { getOrigin } from '../../helpers/origin'
import { getApp } from '../../helpers/app'
import { processSQLWithCtesOrModels } from '../../helpers/catalogAsModels'
import { getAllTemplateTagsInQuery } from 'apps'

function LinkRenderer(props: any) {
  return (
    <a href={props.href} target="_blank" rel="minusxapp" style={{color: '#5f27cd'}}>
      <u>{props.children}</u>
    </a>
  );
}

function ModifiedParagraph(props: any) {
  return (
    <p style={{margin: '5px'}}>{props.children}</p>
  )
}

function ModifiedUL(props: any) {
  return (
    <ul style={{padding: '0px 25px'}}>{props.children}</ul>
  )
}

function ModifiedOL(props: any) {
  return (
    <ol style={{padding: '0px 20px', margin: '5px'}}>{props.children}</ol>
  )
}

function ModifiedPre(props: any) {
    return (
        <pre style={{backgroundColor: '#333', padding: '10px', borderRadius: '5px', color: "#fff", fontWeight: '800', fontSize: '0.9em', whiteSpace: 'break-spaces' }} className="code">
            {props.children}
        </pre>
    )
}

function ZoomableImage({src, alt}: {src: string, alt: string}) {
  return <div style={{cursor: "grabbing"}}>
    <TransformWrapper initialScale={1} doubleClick={{disabled: true}}>
      <TransformComponent>
        <Image src={src} alt={alt}/>
      </TransformComponent>
    </TransformWrapper>
  </div>
}

function ImageComponent(props: any) {
  if (!props) {
    return null
  }
  return <ZoomableImage src={props.src} alt={props.alt}/>
}

function generateMetabaseQuestionURL(origin: string, sql: string, databaseId: number | null = null) {
  // Get all template tags in the query (we don't have access to snippets here, so pass undefined)
  const templateTags = getAllTemplateTagsInQuery(sql);
  
  const cardData = {
    "dataset_query": {
      "database": databaseId,
      "type": "native",
      "native": {
        "query": sql,
        "template-tags": templateTags
      }
    },
    "display": "table",
    "parameters": [],
    "visualization_settings": {},
    "type": "question"
  };
  
  const hash = btoa(JSON.stringify(cardData));
  return `${origin}/question#${hash}`;
}

function extractLastSQLFromMessages(messages: any[], currentMessageIndex: number): string | null {
  // Look backwards from the message before the current one
  for (let i = currentMessageIndex - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant' && message.content?.toolCalls) {
      // Check tool calls in assistant messages
      for (let j = message.content.toolCalls.length - 1; j >= 0; j--) {
        const toolCall = message.content.toolCalls[j];
        if (toolCall.function?.name === 'ExecuteSQLClient' || 
            toolCall.function?.name === 'updateSQLQuery' || 
            toolCall.function?.name === 'runSQLQuery') {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            if (args.sql) {
              // Use the same logic as in the controller to process SQL + CTEs
              const ctes: [string, string][] = args._ctes || args.ctes || [];
              
              return processSQLWithCtesOrModels(args.sql, ctes);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }
  }
  return null;
}

const useAppStore = getApp().useStore();

export function Markdown({content, messageIndex}: {content: string, messageIndex?: number}) {
  const currentThread = useSelector((state: RootState) => 
    state.chat.threads[state.chat.activeThread]
  );
  
  const toolContext = useAppStore((state) => state.toolContext);
  
  // Get settings and cache for dependencies
  const settings = useSelector((state: RootState) => ({
    selectedCatalog: state.settings.selectedCatalog,
    availableCatalogs: state.settings.availableCatalogs,
    modelsMode: state.settings.modelsMode
  }));
  const mxModels = useSelector((state: RootState) => state.cache.mxModels);
  
  // Process template variables like {{MX_LAST_SQL_URL}}
  const processedContent = React.useMemo(() => {
    if (content.includes('{{MX_LAST_SQL_URL}}')) {
      try {
        // Extract last SQL from messages before the current message
        const lastSQL = messageIndex !== undefined 
          ? extractLastSQLFromMessages(currentThread?.messages || [], messageIndex)
          : null;
        
        if (lastSQL) {
          // Get Metabase origin from iframe info
          const metabaseOrigin = getOrigin();
          
          // Get current database ID from app state
          const databaseId = toolContext?.dbId || null;
          
          const questionURL = generateMetabaseQuestionURL(metabaseOrigin, lastSQL, databaseId);
          
          return renderString(content, {
            'MX_LAST_SQL_URL': questionURL
          });
        }
      } catch (error) {
        console.warn('Failed to generate MX_LAST_SQL_URL:', error);
      }
    }
    
    return content;
  }, [content, currentThread?.messages, toolContext?.dbId, messageIndex, settings, mxModels]);

  return (
    <MarkdownComponent remarkPlugins={[remarkGfm]} className={"markdown"} components={{ a: LinkRenderer, p: ModifiedParagraph, ul: ModifiedUL, ol: ModifiedOL, img: ImageComponent, pre: ModifiedPre}}>{processedContent}</MarkdownComponent>
  )
}