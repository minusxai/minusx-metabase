import React, { FC, useState, useMemo, useCallback, useEffect } from "react";

import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Input,
  Divider,
  Badge,
  IconButton,
  Text,
  VStack,
  Collapse,
  Flex,
  Spacer,
  HStack
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FormattedTable, MetabaseModel } from 'apps/types';
import { TableInfo } from "../../state/settings/reducer";
import { getTableData } from 'apps';
import _, { omit, set } from "lodash";
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  FixedSizeNodeComponentProps,
  FixedSizeNodeData,
  FixedSizeTree,
} from 'react-vtree';

type AllTablesOrModelsRenderInfo = Readonly<{
  type: 'allTables' | 'allModels';
  numTables: number;
  numTablesSelected: number;
  handleAllTablesOrModelsCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'allTables' | 'allModels') => void;
}>;
type SchemaRenderInfo = Readonly<{
  type: 'schema';
  name: string;
  numTables: number;
  numTablesSelected: number;
  handleSchemaCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>, schema: string) => void;
}>;
type TableRenderInfo = Readonly<{
  type: 'table';
  isChecked: boolean;
  schemaName: string;
  tableName: string;
  description?: string;
  handleTableCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>, schemaName: string, tableName: string) => void;
}>;
type ModelCollectionRenderInfo = Readonly<{
  type: 'modelCollection';
  name: string;
  numModels: number;
  numModelsSelected: number;
  handleModelCollectionCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>, collection: string) => void;
}>;
type ModelRenderInfo = Readonly<{
  type: 'model';
  isChecked: boolean;
  modelId: number;
  modelName: string;
  collectionName: string;
  handleModelCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>, collectionName: string, modelId: number) => void;
}>;

type NodeRenderInfo = SchemaRenderInfo | TableRenderInfo | ModelCollectionRenderInfo | ModelRenderInfo | AllTablesOrModelsRenderInfo;

type TableDataNode = TableRenderInfo & {
  id: string,
  children: []
}
type SchemaDataNode = SchemaRenderInfo & {
  id: string,
  children: TableDataNode[];
}
type ModelDataNode = ModelRenderInfo & {
  id: string,
  children: []
}

type ModelCollectionDataNode = ModelCollectionRenderInfo & {
  id: string,
  children: ModelDataNode[];
}

type AllTablesOrModelsDataNode = AllTablesOrModelsRenderInfo & {
  id: string,
  children: (SchemaDataNode | ModelCollectionDataNode)[];
}


type DummyRootDataNode = {
  type: 'root',
  id: 'rootNode',
  children: AllTablesOrModelsDataNode[];
}
type DataNode = SchemaDataNode | TableDataNode | ModelCollectionDataNode | ModelDataNode | AllTablesOrModelsDataNode ;

type TreeData = FixedSizeNodeData & { renderData: NodeRenderInfo };

const Node: FC<FixedSizeNodeComponentProps<TreeData>> = ({
  data: { renderData },
  isOpen,
  style,
  toggle,
}) => {
  if (renderData.type == 'schema') {
    const { name, numTables, numTablesSelected, handleSchemaCheckboxChange } = renderData;
    const isAllSelected = numTablesSelected === numTables && numTables > 0;
    const isIndeterminate = numTablesSelected > 0 && numTablesSelected < numTables;
    return <div style={style}>
      <Flex
        align="center"
        bg="gray.50"
        px={5}
        cursor="pointer"
        onClick={toggle}
        _hover={{ bg: "gray.100" }}
      >
        <Checkbox
          isChecked={isAllSelected}
          isIndeterminate={isIndeterminate}
          onChange={(e) => handleSchemaCheckboxChange(e, name)}
          onClick={(e) => e.stopPropagation()}
          mr={1}
          colorScheme="minusxGreen"
        />
        <IconButton
          aria-label={isOpen ? "Collapse schema" : "Expand schema"}
          icon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          size="sm"
          variant="subtle"
          mr={2}
        />
        <Text fontWeight="bold">schema: <Badge color="minusxGreen.600">{name}</Badge></Text>
        <Spacer />
        <Badge color="minusxGreen.600">{numTables} tables</Badge>
      </Flex>
    </div>

  }
  else if (renderData.type == 'table') {
    const { isChecked, schemaName, tableName, handleTableCheckboxChange } = renderData;
    return (
      <div
        style={style}>
        <Flex
          align="center"
          bg="gray.50"
          px={7}
          _hover={{ bg: "gray.100" }}
          minBlockSize={8}
        >

        <Checkbox
          isChecked={isChecked}
          onChange={(e) => handleTableCheckboxChange(e, schemaName, tableName)}
          colorScheme="minusxGreen"
          marginRight={10}
          />
        <Text >{tableName}</Text>
        {/* TODO(@arpit): add back descriptions */}
        {/* <Text>{renderData.description ?? '-'}</Text> */}
          </Flex>
      </div>
    )
  } else if (renderData.type == 'modelCollection') {
    const { name, numModels, numModelsSelected, handleModelCollectionCheckboxChange } = renderData;
    const isAllSelected = numModelsSelected === numModels && numModels > 0;
    const isIndeterminate = numModelsSelected > 0 && numModelsSelected < numModels;
    return <div style={style}>
      <Flex
        align="center"
        bg="gray.50"
        px={5}
        cursor="pointer"
        onClick={toggle}
        _hover={{ bg: "gray.100" }}
      >
        <Checkbox
          isChecked={isAllSelected}
          isIndeterminate={isIndeterminate}
          onChange={(e) => handleModelCollectionCheckboxChange(e, name)}
          onClick={(e) => e.stopPropagation()}
          mr={1}
          colorScheme="minusxGreen"
        />
        <IconButton
          aria-label={isOpen ? "Collapse Collection" : "Expand Collection"}
          icon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          size="sm"
          variant="subtle"
          mr={2}
        />
        <Text fontWeight="bold">collection: <Badge color="minusxGreen.600">{name}</Badge></Text>
        <Spacer />
        <Badge color="minusxGreen.600">{numModels} models</Badge>
      </Flex>
    </div>
  } else if (renderData.type == 'model') {
    const { isChecked, modelId, modelName, collectionName, handleModelCheckboxChange } = renderData;
    return (
      <div
        style={style}>
         <Flex
          align="center"
          bg="gray.50"
          px={7}
          _hover={{ bg: "gray.100" }}
          minBlockSize={8}
        >

        <Checkbox
          isChecked={isChecked}
          onChange={(e) => handleModelCheckboxChange(e, collectionName, modelId)}
          colorScheme="minusxGreen"
          marginRight={10}
          />
        <Text >{modelName}</Text>
        {/* TODO(@arpit): add back descriptions */}
        {/* <Text>{renderData.description ?? '-'}</Text> */}
          </Flex>
      </div>
    )
  } else if (renderData.type == 'allTables' || renderData.type == 'allModels') {
    const { type, numTables, numTablesSelected, handleAllTablesOrModelsCheckboxChange } = renderData;
    const isAllSelected = numTablesSelected === numTables && numTables > 0;
    const isIndeterminate = numTablesSelected > 0 && numTablesSelected < numTables;
    return <div style={style}>
      <Flex
        align="center"
        bg="gray.50"
        px={2}
        cursor="pointer"
        onClick={toggle}
        _hover={{ bg: "gray.100" }}
      >
        <Checkbox
          isChecked={isAllSelected}
          isIndeterminate={isIndeterminate}
          onChange={(e) => handleAllTablesOrModelsCheckboxChange(e, type)}
          onClick={(e) => e.stopPropagation()}
          mr={1}
          colorScheme="minusxGreen"
        />
        <IconButton
          aria-label={isOpen ? "Collapse schema" : "Expand schema"}
          icon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          size="sm"
          variant="subtle"
          mr={2}
        />
        <Text fontWeight="bold">ALL {type == 'allModels'? 'METABASE MODELS' : 'TABLES'}</Text>
      </Flex>
    </div>
  }
}

type TableUpdateFn = (value: TableInfo[]) => void;
type ModelUpdateFn = (value: MetabaseModel[]) => void;
interface HierarchicalFilteredTableProps {
  dbId: number;
  tableData: FormattedTable[];
  selectedTableData: FormattedTable[];
  modelData: MetabaseModel[];
  selectedModelData: MetabaseModel[];
  addFn: TableUpdateFn;
  removeFn: TableUpdateFn;
  updateSelectedModels: ModelUpdateFn;
}

type GroupedTables = {
  [schema: string]: FormattedTable[];
};

type GroupedModels = {
  [collection: string]: MetabaseModel[];
};

export const FilteredTable = ({
  dbId,
  tableData,
  selectedTableData,
  modelData,
  selectedModelData,
  addFn,
  removeFn,
  updateSelectedModels,
}: HierarchicalFilteredTableProps) => {
  const [search, setSearch] = useState("");
  const [fetchedTableData, setFetchedTableData] = useState<Map<number, FormattedTable>>(new Map());

  const groupedTableData = useMemo(() => {
    return _.groupBy(tableData, 'schema');
  }, [tableData]);

  const groupedModelData = useMemo(() => {
    return _.groupBy(modelData.map(model => ({...model, collectionName: model.collectionName || 'empty'})), 'collectionName');
  }, [modelData]);

  const filteredGroupedTableData = useMemo(() => {
    if (!search) {
      return groupedTableData;
    }
    const lowerSearch = search.toLowerCase();
    const result: GroupedTables = {};

    for (const schema in groupedTableData) {
      const matchingTables = groupedTableData[schema].filter(table =>
        table.name.toLowerCase().startsWith(lowerSearch)
      );
      if (matchingTables.length > 0) {
        result[schema] = matchingTables;
      }
    }
    return result;
  }, [groupedTableData, search]);

  const filteredGroupedModelData = useMemo(() => {
    if (!search) {
      return groupedModelData;
    }
    const lowerSearch = search.toLowerCase();
    const result: GroupedModels = {};
    for (const collection in groupedModelData) {
      const matchingModels = groupedModelData[collection].filter(model =>
        model.name.toLowerCase().startsWith(lowerSearch)
      );
      if (matchingModels.length > 0) {
        result[collection] = matchingModels;
      }
    }
    return result;
  }, [groupedModelData, search]);

  const selectedTableSet = useMemo(() => {
    return new Set(selectedTableData.map(item => `${item.schema}/${item.name}`));
  }, [selectedTableData]);

  const selectedModelSet = useMemo(() => {
    return new Set(selectedModelData.map(item => `${item.modelId}`));
  }, [selectedModelData]);

  // Extract table IDs from selectedData by matching with data
  const selectedTableIds = useMemo(() => {
    const selectedKeys = new Set(selectedTableData.map(item => `${item.schema}/${item.name}`));
    return tableData
      .filter(table => selectedKeys.has(`${table.schema}/${table.name}`))
      .map(table => table.id);
  }, [selectedTableData, tableData]);

  // Periodically fetch table data for selected tables
  useEffect(() => {
    if (selectedTableIds.length === 0) {
      setFetchedTableData(new Map());
      return;
    }

    const fetchTableDataForSelected = async () => {
      const promises = selectedTableIds.map(async (tableId) => {
        try {
          const tableData = await getTableData(tableId);
          if (tableData !== "missing") {
            return [tableId, tableData] as const;
          }
        } catch (error) {
          console.warn(`Failed to fetch table data for ID ${tableId}:`, error);
        }
        return null;
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((result): result is [number, FormattedTable] => result !== null);
      
      setFetchedTableData(new Map(validResults));
    };
    fetchTableDataForSelected()

    // Set up 3-second interval
    const intervalId = setInterval(fetchTableDataForSelected, 3000);

    return () => clearInterval(intervalId);
  }, [selectedTableIds]);


  const handleTableCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, schemaName: string, tableName: string) => {
    const tableInfo = { name: tableName, schema: schemaName, dbId: dbId };
    if (e.target.checked) {
      addFn([tableInfo]);
    } else {
      removeFn([tableInfo]);
    }
  }, [addFn, removeFn, dbId]);

  const handleSchemaCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, schema: string) => {
    const tablesInSchema = filteredGroupedTableData[schema];
    const tables: TableInfo[] = []
    if (e.target.checked) {
      tablesInSchema.forEach(table => {
        if (!selectedTableSet.has(`${table.schema}/${table.name}`)) {
          tables.push({ name: table.name, schema: table.schema, dbId: dbId });
        }
      });
      addFn(tables);
    } else {
      tablesInSchema.forEach(table => {
        if (selectedTableSet.has(`${table.schema}/${table.name}`)) {
          tables.push({ name: table.name, schema: table.schema, dbId: dbId });
        }
      });
      removeFn(tables);
    }
  }, [addFn, removeFn, dbId, selectedTableSet]);

  const handleAllTablesCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const allTables: TableInfo[] = [];
    Object.values(filteredGroupedTableData).flat().forEach(table => {
      allTables.push({ name: table.name, schema: table.schema, dbId: dbId });
    });

    if (e.target.checked) {
      const unselectedTables = allTables.filter(table => 
        !selectedTableSet.has(`${table.schema}/${table.name}`)
      );
      addFn(unselectedTables);
    } else {
      const selectedTables = allTables.filter(table => 
        selectedTableSet.has(`${table.schema}/${table.name}`)
      );
      removeFn(selectedTables);
    }
  }, [addFn, removeFn, dbId, selectedTableSet, filteredGroupedTableData]);

  const handleAllModelsCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      updateSelectedModels(modelData);
    } else {
      updateSelectedModels([]);
    }
  }, [updateSelectedModels, dbId]);

  const handleModelCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, collectionName: string | null, modelId: number) => {
    const modelInfo = modelData.find(model => model.modelId === modelId);
    if (modelInfo) {
      if (e.target.checked) {
        updateSelectedModels([...selectedModelData, modelInfo]);
      } else {
        updateSelectedModels(selectedModelData.filter(model => model.modelId !== modelId));
      }
    }
  }, [updateSelectedModels, dbId, selectedModelData, modelData]);

  const handleModelCollectionCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, collectionName: string | null) => {
    const modelsInCollection = groupedModelData[collectionName || 'empty'];
    const thisCollectionSet = new Set(modelsInCollection.map(model => `${model.modelId}`));
    let newSelectedModelsSet: Set<string>;
    if (e.target.checked) {
      // avoid duplicates
      newSelectedModelsSet = new Set([...selectedModelSet, ...thisCollectionSet]);
    } else {
      newSelectedModelsSet = selectedModelSet.difference(thisCollectionSet);
    }
    const newSelectedModels = Array.from(newSelectedModelsSet)
        .map(modelId => modelData.find(model => model.modelId === parseInt(modelId)))
        .filter((model): model is MetabaseModel => model !== undefined);
    updateSelectedModels(newSelectedModels);
    
  }, [updateSelectedModels, dbId, selectedModelSet, groupedModelData]);


  // Calculate sync status from actively fetched table data
  const syncStats = useMemo(() => {
    const fetchedTables = Array.from(fetchedTableData.values());
    const tablesWithCompletionData = fetchedTables.filter(table => 
      typeof table.sample_values_completion_percentage === 'number'
    );
    
    if (tablesWithCompletionData.length === 0) {
      return { synced: 0, total: selectedTableIds.length, percentage: 0 };
    }
    
    const fullyLoaded = tablesWithCompletionData.filter(table => 
      table.sample_values_completion_percentage === 100
    ).length;
    
    const avgPercentage = Math.round(
      tablesWithCompletionData.reduce((sum, table) => 
        sum + table.sample_values_completion_percentage!, 0
      ) / tablesWithCompletionData.length
    );
    
    return {
      synced: fullyLoaded,
      total: tablesWithCompletionData.length,
      percentage: avgPercentage
    };
  }, [fetchedTableData, selectedTableIds]);

  const rootNode: DummyRootDataNode = {
    type: 'root',
    id: 'rootNode',
    children: [
      {
        type: 'allTables',
        id: 'allTablesNode',
        numTables: Object.values(filteredGroupedTableData).flat().length,
        numTablesSelected: Object.values(filteredGroupedTableData).flat().filter(table =>
          selectedTableSet.has(`${table.schema}/${table.name}`)
        ).length,
        handleAllTablesOrModelsCheckboxChange: handleAllTablesCheckboxChange,
        children: Object.entries(filteredGroupedTableData).map(([schema, tables]) => ({
          type: 'schema',
          id: `schemaNode-${schema}`,
          name: schema,
          tables,
          numTables: tables.length,
          numTablesSelected: tables.filter(table =>
            selectedTableSet.has(`${schema}/${table.name}`)
          ).length,
          handleSchemaCheckboxChange,
          children: tables.map((table) => ({
            type: 'table',
            id: `tableNode-${schema}-${table.name}`,
            schemaName: schema,
            tableName: table.name,
            isChecked: selectedTableSet.has(`${schema}/${table.name}`),
            handleTableCheckboxChange,
            children: []
          })),
        })),
      },
      {
        type: 'allModels',
        id: 'allModelsNode',
        numTables: Object.values(filteredGroupedModelData).flat().length,
        numTablesSelected: Object.values(filteredGroupedModelData).flat().filter(model =>
          selectedModelSet.has(`${model.modelId}`)
        ).length,
        handleAllTablesOrModelsCheckboxChange: handleAllModelsCheckboxChange,
        children: Object.entries(filteredGroupedModelData).map(([collection, models]) => ({
          type: 'modelCollection',
          id: `modelCollectionNode-${collection}`,
          name: collection,
          models,
          numModels: models.length,
          numModelsSelected: models.filter(model =>
            selectedModelSet.has(`${model.modelId}`)
          ).length,
          handleModelCollectionCheckboxChange,
          children: models.map((model) => ({
            type: 'model',
            id: `modelNode-${collection}-${model.modelId}`,
            modelId: model.modelId,
            modelName: model.name,
            collectionName: collection,
            isChecked: selectedModelSet.has(`${model.modelId}`),
            handleModelCheckboxChange,
            children: []
          })),
        })),
      }
    ]
    
  }

  function* treeWalker(
    refresh: boolean,
  ): Generator<TreeData | string | symbol, void, boolean> {
    for (let k = 0; k < rootNode.children.length; k++) {
      const allTablesOrModelsNode = rootNode.children[k];
      const isOpened = yield refresh
        ? {
          id: `allTablesOrModelsNode-${allTablesOrModelsNode.type}`,
          isOpenByDefault: allTablesOrModelsNode.type == 'allTables' ? true : false,
          renderData: omit(allTablesOrModelsNode, 'children')
        } : `allTablesOrModelsNode-${allTablesOrModelsNode.type}`;
      if (isOpened) {
        for (let i = 0; i < allTablesOrModelsNode.children.length; i++) {
          const childNode = allTablesOrModelsNode.children[i];
          const isOpened = yield refresh
            ? {
              id: `modelCollectionOrSchemaNode-${childNode.name}`,
              isOpenByDefault: childNode.type == 'schema' ? true : false,
              renderData: childNode
            } : `modelCollectionOrSchemaNode-${childNode.name}`;
          if (isOpened) {
            for (let j = 0; j < childNode.children.length; j++) {
              const grandChildNode = childNode.children[j];
              if (grandChildNode.type == 'model') {
                yield refresh
                ? {
                  id: `modelNode-${grandChildNode.collectionName}-${grandChildNode.modelName}`,
                  isOpenByDefault: false,
                  renderData: grandChildNode
                } : `modelNode-${grandChildNode.collectionName}-${grandChildNode.modelName}`;
              }
              else if (grandChildNode.type == 'table') {
                yield refresh
                  ? {
                    id: `tableNode-${grandChildNode.schemaName}-${grandChildNode.tableName}`,
                    isOpenByDefault: false,
                    renderData: grandChildNode
                  } : `tableNode-${grandChildNode.schemaName}-${grandChildNode.tableName}`;
              }
            }
          }
        }
      }
    }
    
  }


  return (
    <Box>
      <HStack justifyContent={"space-between"} m={0} p={0} gap={0}>
      {/* <Flex align="center" mb={2} mt={2}>
        <Checkbox
          isChecked={isOverallChecked}
          isIndeterminate={isOverallIndeterminate}
          onChange={handleOverallCheckboxChange}
          colorScheme="minusxGreen"
          mr={3}
        />
        <Text fontWeight="semibold">
          {totalSelectedFilteredTables === totalFilteredTables ? "Deselect All Tables" : "Select All Tables" }
        </Text>
      </Flex> */}
      <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"left"} fontWeight={"bold"} marginBottom={2}>
        [{selectedTableData.length}/{tableData.length} tables selected, {selectedModelData.length}/{modelData.length} models selected
        {syncStats.total > 0 && ` • ${syncStats.synced}/${syncStats.total} synced`}]
      </Text>

      </HStack>
      <Box position="relative" width="100%" mb={2} p={0}>
        <Input
          placeholder={`Search table name (${tableData.length} tables across ${Object.keys(groupedTableData).length} schemas)`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          borderColor={"minusxGreen.600"}
        />
      </Box>

      <Box maxHeight={"280px"} overflowY={"scroll"} borderWidth="1px" borderRadius="md" mb={2}>
        <VStack spacing={0} align="stretch">
          {
            // NOTE(@arpit): not sure why AutoSizer is not working here. hardcoding height for now
            <FixedSizeTree
              treeWalker={treeWalker}
              itemSize={32}
              height={280}
              width="100%"
            >
              {Node}
            </FixedSizeTree>
          }
          {/* TODO(@arpit): figure out why this no tables component is not rendering */}
          {Object.keys(filteredGroupedTableData).length === 0 && (
            <Text p={4} textAlign="center" color="gray.500">
              No tables match your search criteria.
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
}