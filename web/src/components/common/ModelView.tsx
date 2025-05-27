import React, { useEffect, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { CodeBlock } from './CodeBlock'
import { getApp } from '../../helpers/app';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { load, dump } from 'js-yaml';
import { getTableContextYAML, memoizedFetchTableData } from 'apps';
import { createSchemaFromDataModel } from '../../helpers/catalog';
import { isEmpty } from 'lodash';

interface ModelViewProps {
  yamlContent?: string;
  tables?: FormattedTable[]
}

const useAppStore = getApp().useStore()

export const ModelView: React.FC<ModelViewProps> = ({ yamlContent, tables }) => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const drMode = useSelector((state: RootState) => state.settings.drMode);
  const relevantTables = tables ? tables : toolContext.relevantTables || []
  const [isLoading, setIsLoading] = useState(true)
  const [loadedTables, setLoadedTables] = useState<FormattedTable[]>([])

  useEffect(() => {
    Promise.all(relevantTables.map(table => memoizedFetchTableData(table.id))).then((tableInfos) => {
      setIsLoading(false)
      const loadedTableInfos = tableInfos.filter(tableInfo => tableInfo != "missing")
      setLoadedTables(loadedTableInfos)
    }).catch(() => {
      setIsLoading(false)
    });
  }, [relevantTables])

  if (isLoading) {
    return (
      <Text>Loading...</Text>
    )
  }

  let entityJSON
  if (!tables) {
    let yamlContentJSON
    try {
      yamlContentJSON = yamlContent ? load(yamlContent) : {}
    } catch (e) {
      console.error('Invalid YAML content:', e);
    }
    entityJSON = getTableContextYAML(loadedTables, yamlContentJSON, drMode) || {};
  } else {
    entityJSON = getTableContextYAML(loadedTables, undefined, drMode) || {};
  }
  const modelViewSchema = dump(createSchemaFromDataModel(entityJSON));
  return (
    <Box w="100%">
      <CodeBlock 
        code={modelViewSchema} 
        tool="" 
        language="yaml" 
      />
    </Box>
  );
};
