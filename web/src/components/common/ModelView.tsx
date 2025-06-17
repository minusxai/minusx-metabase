import React, { useEffect, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { CodeBlock } from './CodeBlock'
import { getApp } from '../../helpers/app';
import { FormattedTable, MetabaseContext, MetabaseModel } from 'apps/types';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { load, dump } from 'js-yaml';
import { getTableData, filterTablesByCatalog, getTableContextYAML, getModelsWithFields } from 'apps';
import { createSchemaFromDataModel } from '../../helpers/catalog';
import { isEmpty } from 'lodash';

interface ModelViewProps {
  yamlContent?: string;
  tables?: FormattedTable[]
  metabaseModels?: MetabaseModel[]
}

const useAppStore = getApp().useStore()

export const ModelView: React.FC<ModelViewProps> = ({ yamlContent, tables, metabaseModels }) => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const drMode = useSelector((state: RootState) => state.settings.drMode);
  let yamlContentJSON
  try {
    yamlContentJSON = yamlContent ? load(yamlContent) : {}
  } catch (e) {
    console.error('Invalid YAML content:', e);
  }
  const relevantTables = tables ? tables : filterTablesByCatalog(toolContext.dbInfo.tables, yamlContentJSON)
  const [isTablesLoading, setIsTablesLoading] = useState(true)
  const [loadedTables, setLoadedTables] = useState<FormattedTable[]>([])
  const [isModelsLoading, setIsModelsLoading] = useState(true)
  const [loadedModels, setLoadedModels] = useState<FormattedTable[]>([])

  useEffect(() => {
    if (metabaseModels) {
      setIsModelsLoading(false)
      getModelsWithFields(metabaseModels).then((models) => {
        setLoadedModels(models)
      })
    }
  }, [metabaseModels])

  useEffect(() => {
    Promise.all(relevantTables.map(table => getTableData(table.id))).then((tableInfos) => {
      setIsTablesLoading(false)
      const loadedTableInfos = tableInfos.filter(tableInfo => tableInfo != "missing")
      setLoadedTables(loadedTableInfos)
    }).catch(() => {
      setIsTablesLoading(false)
    });
  }, [tables])

  if (isTablesLoading || isModelsLoading) {
    return (
      <Text>Loading...</Text>
    )
  }

  const allFormattedTables = [...loadedTables, ...loadedModels]

  const entityJSON = getTableContextYAML(allFormattedTables, !tables ? yamlContentJSON : undefined, drMode) || {};
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
