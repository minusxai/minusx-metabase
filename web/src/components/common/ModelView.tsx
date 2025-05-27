import React from 'react';
import { Box } from '@chakra-ui/react';
import { CodeBlock } from './CodeBlock'
import { getApp } from '../../helpers/app';
import { MetabaseContext } from 'apps/types';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { load, dump } from 'js-yaml';
import { getTableContextYAML } from 'apps';

interface ModelViewProps {
  yamlContent?: string;
}

const useAppStore = getApp().useStore()

export const ModelView: React.FC<ModelViewProps> = ({ yamlContent }) => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const drMode = useSelector((state: RootState) => state.settings.drMode);
  const relevantTables = toolContext.relevantTables || []
  let yamlContentJSON = {}
  try {
    yamlContentJSON = yamlContent ? load(yamlContent) : {}
  } catch (e) {
    console.error('Invalid YAML content:', e);
  }
  const modelViewYAML = getTableContextYAML(relevantTables, yamlContentJSON, drMode);
  return (
    <Box w="100%">
      <CodeBlock 
        code={JSON.stringify(modelViewYAML, null, 2)} 
        tool="" 
        language="yaml" 
      />
    </Box>
  );
};
