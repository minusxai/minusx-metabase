import React from 'react-redux'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';

import vsd from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import { getPlatformLanguage } from '../../helpers/utils';

SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);

export const CodeBlock = ({ code, tool }: { code: string, tool: string }) => {
  return (
    <SyntaxHighlighter language={getPlatformLanguage(tool)} style={vsd}>
      {code}
    </SyntaxHighlighter>
  )
}