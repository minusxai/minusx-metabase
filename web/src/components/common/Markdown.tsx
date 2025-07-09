import React, { useEffect, useState } from 'react';
import MarkdownComponent from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ChatContent.css'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Image, Box, Button, Collapse } from "@chakra-ui/react"
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { renderString } from '../../helpers/templatize'
import { getOrigin } from '../../helpers/origin'
import { getApp } from '../../helpers/app'
import { processSQLWithCtesOrModels } from '../../helpers/catalogAsModels'
import { getAllTemplateTagsInQuery, replaceLLMFriendlyIdentifiersInSqlWithModels } from 'apps'
import type { MetabaseModel } from 'apps/types'
import { Badge } from "@chakra-ui/react";
import { CodeBlock } from './CodeBlock';
import { BiChevronDown, BiChevronRight } from 'react-icons/bi';


function LinkRenderer(props: any) {
  return (
    <a href={props.href} target="_blank" rel="minusxapp" style={{color: '#5f27cd'}}>
      <u>{props.children}</u>
    </a>
  );
}

const processRogueParagraphs = (text: string) => {
    const badgeTypes = [
        { tag: '[badge_mx]Sources', label: 'Sources' },
        { tag: '[badge_mx]Logic', label: 'Logic' },
        { tag: '[badge_mx]Assumptions', label: 'Assumptions' }
    ];
    
    let processedText = text;
    let resultElements: React.ReactNode[] = [];
    
    for (const badge of badgeTypes) {
        if (processedText.includes(badge.tag)) {
            const parts = processedText.split(badge.tag);
            if (parts[0]) resultElements.push(parts[0]);
            // Add a line break before each badge
            resultElements.push(<br key={`br-${badge.label}`}></br>);
            resultElements.push(
                <Badge key={`${badge.label.toLowerCase()}`} bg="minusxGreen.600" color="white" mx={1}>
                    {badge.label}
                </Badge>
            );
            processedText = parts[1];
        }
    }
    
    // Add any remaining text
    if (processedText) resultElements.push(processedText);
    
    return resultElements;
};

function ModifiedParagraph(props: any) {

    return (
        <p style={{margin: '3px', wordBreak: 'break-word', overflowWrap: 'break-word', wordWrap: 'break-word', whiteSpace: 'normal'}}>
            {props.children?.toString().includes('[badge_mx]') ? processRogueParagraphs(props.children) : props.children}
        </p>
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

function HorizontalLine() {
    return (
        <hr style={{borderTop: '1px solid #c6c1be', marginTop: '20px'}} />
    )
}

function ModifiedPre(props: any) {
    return (
        <pre style={{fontSize: '0.9em', whiteSpace: 'break-spaces', margin: '0px'}} className="code">
            {props.children}
        </pre>
    )
}

function ModifiedCode(props: any) {
    const [isOpen, setIsOpen] = useState(true);
    
    if (!props.className) { // inline code
        const text = props.children?.toString() || '';
        
        if (text.startsWith('[badge]')) {
        return <Badge color={"minusxGreen.600"}>{text.replace('[badge]', '')}</Badge>;
        }
        if (text.startsWith('[badge_mx]')) {
        return <><br></br><Badge bg={"minusxGreen.600"} color={"white"}>{text.replace('[badge_mx]', '')}</Badge></>;
        }
    }
    
    // For code blocks, wrap in collapsible component
    return (
        <Box>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="xs"
                variant="solid"
                my={1}
                colorScheme="minusxGreen"
                border={"1px solid #eee"}
                rightIcon={<span>{isOpen ? <BiChevronDown/> : <BiChevronRight/>}</span>}
            >
                {isOpen ? 'Hide' : 'Show'} SQL Code
            </Button>
            <Collapse in={isOpen} animateOpacity>
                <CodeBlock code={props.children?.toString() || ''} tool='metabase' language='sql'/>
            </Collapse>
        </Box>
    );
};

function ModifiedBlockquote(props: any) {
    return (
        <blockquote style={{borderLeft: '4px solid #14a085', paddingLeft: '0px', fontStyle: 'italic', margin: '10px'}}>
            {props.children}
        </blockquote>
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
            toolCall.function?.name === 'ExecuteQuery' ||
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
        let lastSQL = messageIndex !== undefined 
          ? extractLastSQLFromMessages(currentThread?.messages || [], messageIndex)
          : null;
        if (lastSQL) {
          const allModels: MetabaseModel[] = toolContext?.dbInfo?.models || []
          lastSQL = replaceLLMFriendlyIdentifiersInSqlWithModels(lastSQL, allModels)
        }
        
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
    <MarkdownComponent remarkPlugins={[remarkGfm]} className={"markdown"} components={{ a: LinkRenderer, p: ModifiedParagraph, ul: ModifiedUL, ol: ModifiedOL, img: ImageComponent, pre: ModifiedPre, blockquote: ModifiedBlockquote, code: ModifiedCode, hr: HorizontalLine}}>{processedContent}</MarkdownComponent>
  )
}