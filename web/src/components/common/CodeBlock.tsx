import React from 'react-redux'
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';

import vsd from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import { getPlatformLanguage } from '../../helpers/utils';
import { diffLines } from 'diff'

SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);  

function getCombinedCodeAndDiffs(code_new: string, code_old: string | undefined) {
  if (code_old === undefined) {
    return { combinedCode: code_new, diffLineIndices: { added: [], removed: [] } };
  }
  const codeDiff = diffLines(code_old, code_new);

  const combinedCode = codeDiff.map((part: any) => {
    const prefix = part.added ? '+  ' : (part.removed ? '-  ' : '');
    return part.value.split('\n')
      .filter((line: string) => line) // Remove empty lines
      .map((line: string) => prefix + ' ' + line)
      .join('\n');
  }).join('\n');

  const diffLineIndices: {
    added: number[],
    removed: number[]
  } = {
    added: [],
    removed: []
  };
  let currentIndex = 1;
  
  codeDiff.forEach((part: any) => {
    const lines = part.value.split('\n').filter((line: string) => line);
    
    if (part.added || part.removed) {
      const type = part.added ? 'added' : 'removed';
      lines.forEach(() => {
        diffLineIndices[type].push(currentIndex);
        currentIndex++;
      });
    } else {
      currentIndex += lines.length;
    }
  });

  console.log(combinedCode);
  console.log(diffLineIndices);

  return { combinedCode, diffLineIndices};
}

export const CodeBlock = ({ code, tool, oldCode }: { code: string, tool: string, oldCode: string | undefined }) => {
  
  const validDiff = oldCode!==undefined;

  const language = getPlatformLanguage(tool);
  const { combinedCode, diffLineIndices } = getCombinedCodeAndDiffs(code, oldCode);

  const linePropsFn = (lineNumber: number) => {
    let style = {wordWrap: 'break-word', whiteSpace: 'pre-wrap', paddingBottom: '1px', display: 'block', backgroundColor: '#1e1e1e'};
    return { style }
  }

  const lineDiffFn = (lineNumber: number) => {
    let style = linePropsFn(lineNumber).style;
    if (diffLineIndices.added.includes(lineNumber)) {
      style.backgroundColor = '#034219';
    } else if (diffLineIndices.removed.includes(lineNumber)) {
      style.backgroundColor = "#5c1d16";
    }
    return { style }
  }

  return (
    <Tabs isFitted colorScheme={'minusXGreen'} size={"sm"}>
      { validDiff && <TabList borderBottom={'none'}>
        <Tab>Updated {language}</Tab>
        <Tab>Diff</Tab>
      </TabList> }

      <TabPanels bg={"#1e1e1e"} borderRadius={5} mt={0} maxHeight={"500px"} overflow={"scroll"}>
        <TabPanel p={0}>
          <SyntaxHighlighter language={language} style={vsd} showLineNumbers={true} wrapLines={true} lineProps={linePropsFn} lineNumberStyle={{display: 'none'}}>
            {code}
          </SyntaxHighlighter>
        </TabPanel>
        { validDiff && <TabPanel p={0}>
          <SyntaxHighlighter language={language} style={vsd} showLineNumbers={true} wrapLines={true} lineProps={lineDiffFn} lineNumberStyle={{display: 'none'}}>
            {combinedCode}
          </SyntaxHighlighter>
        </TabPanel> }
      </TabPanels>
    </Tabs>
  )
}