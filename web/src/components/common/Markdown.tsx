import React, { useEffect, useState } from 'react';
import MarkdownComponent from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './ChatContent.css'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Image } from "@chakra-ui/react"

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

function ModifiedCode(props: any) {
    return (
        <code style={{backgroundColor: '#ddd', padding: '2px', borderRadius: '5px', color: "#16a085", fontWeight: '800', fontSize: '0.9em'}} className="code">
            {props.children}
        </code>
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

export function Markdown({content}: {content: string}) {
  return (
    <MarkdownComponent remarkPlugins={[remarkGfm]} className={"markdown"} components={{ a: LinkRenderer, p: ModifiedParagraph, ul: ModifiedUL, ol: ModifiedOL, img: ImageComponent, code: ModifiedCode}}>{content}</MarkdownComponent>
  )
}