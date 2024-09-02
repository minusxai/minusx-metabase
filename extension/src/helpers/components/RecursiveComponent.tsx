import React from 'react';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type NodeType = keyof JSX.IntrinsicElements;

interface MarkdownElement {
    type: "Markdown";
    children: string;
}

interface JSXElement {
  type: NodeType;
  props?: Record<string, any>;
  children?: TreeNode[] | string;
}

export type TreeNode = MarkdownElement | JSXElement;

const RenderTree: React.FC<{ node: TreeNode }> = ({ node }) => {
  const { type, children } = node;
  if (type === 'Markdown') {
    return <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
  }
  const { props } = node
  const Component = type

  if (typeof children === 'string') {
    return React.createElement(type, props, children);
  }

  return (
    <Component {...props}>
      {children?.map((childNode, index) => (
        <RenderTree key={index} node={childNode} />
      ))}
    </Component>
  );
};

export default RenderTree;