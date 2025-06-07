import React, { useEffect, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { CodeBlock } from './CodeBlock'
import { getApp } from '../../helpers/app';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { load, dump } from 'js-yaml';
import { getTableData, filterTablesByCatalog, getTableContextYAML } from 'apps';
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
  let yamlContentJSON
  try {
    yamlContentJSON = yamlContent ? load(yamlContent) : {}
  } catch (e) {
    console.error('Invalid YAML content:', e);
  }
  const relevantTables = tables ? tables : filterTablesByCatalog(toolContext.dbInfo.tables, yamlContentJSON)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedTables, setLoadedTables] = useState<FormattedTable[]>([])

  useEffect(() => {
    Promise.all(relevantTables.map(table => getTableData(table.id))).then((tableInfos) => {
      setIsLoading(false)
      const loadedTableInfos = tableInfos.filter(tableInfo => tableInfo != "missing")
      setLoadedTables(loadedTableInfos)
    }).catch(() => {
      setIsLoading(false)
    });
  }, [tables])

  if (isLoading) {
    return (
      <Text>Loading...</Text>
    )
  }

  const entityJSON = getTableContextYAML(loadedTables, !tables ? yamlContentJSON : undefined, drMode) || {};
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
