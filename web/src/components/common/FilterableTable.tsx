import React, { FC, useState, useMemo, useCallback } from "react";

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
import { FormattedTable } from 'apps/types';
import { TableInfo } from "../../state/settings/reducer";
import _, { omit, set } from "lodash";
import AutoSizer from 'react-virtualized-auto-sizer';
import {
  FixedSizeNodeComponentProps,
  FixedSizeNodeData,
  FixedSizeTree,
} from 'react-vtree';

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

type NodeRenderInfo = SchemaRenderInfo | TableRenderInfo;

type TableDataNode = TableRenderInfo & {
  id: string,
  children: []
}
type SchemaDataNode = SchemaRenderInfo & {
  id: string,
  children: TableDataNode[];
}
type DummyRootDataNode = {
  type: 'root',
  id: 'rootNode',
  children: SchemaDataNode[];
}
type DataNode = SchemaDataNode | TableDataNode;

type TreeData = FixedSizeNodeData & { renderData: NodeRenderInfo };

const Node: FC<FixedSizeNodeComponentProps<TreeData>> = ({
  data: { renderData },
  isOpen,
  style,
  height,
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
        px={2}
        cursor="pointer"
        onClick={toggle}
        _hover={{ bg: "gray.100" }}
        minHeight={height}
        maxHeight={height}
      >
        <Checkbox
          isChecked={isAllSelected}
          isIndeterminate={isIndeterminate}
          onChange={(e) => handleSchemaCheckboxChange(e, name)}
          onClick={(e) => e.stopPropagation()}
          mr={3}
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
  else {
    const { isChecked, schemaName, tableName, handleTableCheckboxChange } = renderData;
    return (
      <div
        style={{
          ...style,
          alignItems: 'center',
          display: 'flex',
          marginLeft: 8
        }}>

        <Checkbox
          isChecked={isChecked}
          onChange={(e) => handleTableCheckboxChange(e, schemaName, tableName)}
          colorScheme="minusxGreen"
          marginRight={10}
        />
        <Text >{tableName}</Text>
        {/* TODO(@arpit): add back descriptions */}
        {/* <Text>{renderData.description ?? '-'}</Text> */}
      </div>
    )
  }
}

type TableUpdateFn = (value: TableInfo[]) => void;

interface HierarchicalFilteredTableProps {
  dbId: number;
  data: FormattedTable[];
  selectedData: FormattedTable[];
  addFn: TableUpdateFn;
  removeFn: TableUpdateFn;
}

type GroupedTables = {
  [schema: string]: FormattedTable[];
};

export const FilteredTable = ({
  dbId,
  data,
  selectedData,
  addFn,
  removeFn
}: HierarchicalFilteredTableProps) => {
  const [search, setSearch] = useState("");
  const [clicks, setClicks] = useState(0);

  const groupedData = useMemo(() => {
    return _.groupBy(data, 'schema');
  }, [data]);

  const filteredGroupedData = useMemo(() => {
    if (!search) {
      return groupedData;
    }
    const lowerSearch = search.toLowerCase();
    const result: GroupedTables = {};

    for (const schema in groupedData) {
      const matchingTables = groupedData[schema].filter(table =>
        table.name.toLowerCase().startsWith(lowerSearch)
      );
      if (matchingTables.length > 0) {
        result[schema] = matchingTables;
      }
    }
    return result;
  }, [groupedData, search]);

  const selectedSet = useMemo(() => {
    return new Set(selectedData.map(item => `${item.schema}/${item.name}`));
  }, [selectedData]);


  const handleTableCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, schemaName: string, tableName: string) => {
    const tableInfo = { name: tableName, schema: schemaName, dbId: dbId };
    if (e.target.checked) {
      addFn([tableInfo]);
    } else {
      removeFn([tableInfo]);
    }
    setClicks(1);
  }, [addFn, removeFn, dbId]);

  const handleSchemaCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, schema: string) => {
    const tablesInSchema = filteredGroupedData[schema];
    const tables: TableInfo[] = []
    if (e.target.checked) {
      tablesInSchema.forEach(table => {
        if (!selectedSet.has(`${table.schema}/${table.name}`)) {
          tables.push({ name: table.name, schema: table.schema, dbId: dbId });
        }
      });
      addFn(tables);
    } else {
      tablesInSchema.forEach(table => {
        if (selectedSet.has(`${table.schema}/${table.name}`)) {
          tables.push({ name: table.name, schema: table.schema, dbId: dbId });
        }
      });
      removeFn(tables);
    }
    setClicks(1);
  }, [addFn, removeFn, dbId, selectedSet]);

  const handleOverallCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const allTables: TableInfo[] = [];
    Object.values(filteredGroupedData).flat().forEach(table => {
      allTables.push({ name: table.name, schema: table.schema, dbId: dbId });
    });

    if (e.target.checked) {
      const unselectedTables = allTables.filter(table => 
        !selectedSet.has(`${table.schema}/${table.name}`)
      );
      addFn(unselectedTables);
    } else {
      const selectedTables = allTables.filter(table => 
        selectedSet.has(`${table.schema}/${table.name}`)
      );
      removeFn(selectedTables);
    }
    setClicks(1);
  }, [addFn, removeFn, dbId, selectedSet, filteredGroupedData]);

  const totalFilteredTables = Object.values(filteredGroupedData).flat().length;
  const totalSelectedFilteredTables = Object.values(filteredGroupedData).flat().filter(table =>
    selectedSet.has(`${table.schema}/${table.name}`)
  ).length;
  const isOverallChecked = totalSelectedFilteredTables === totalFilteredTables && totalFilteredTables > 0;
  const isOverallIndeterminate = totalSelectedFilteredTables > 0 && totalSelectedFilteredTables < totalFilteredTables;

  const rootNode: DummyRootDataNode = {
    type: 'root',
    id: 'rootNode',
    children: Object.entries(filteredGroupedData).map(([schema, tables]) => ({
      type: 'schema',
      id: `schemaNode-${schema}`,
      name: schema,
      tables,
      numTables: tables.length,
      numTablesSelected: tables.filter(table =>
        selectedSet.has(`${schema}/${table.name}`)
      ).length,
      handleSchemaCheckboxChange,
      children: tables.map((table) => ({
        type: 'table',
        id: `tableNode-${schema}-${table.name}`,
        schemaName: schema,
        tableName: table.name,
        isChecked: selectedSet.has(`${schema}/${table.name}`),
        handleTableCheckboxChange,
        children: []
      })),
    })),
  }

  function* treeWalker(
    refresh: boolean,
  ): Generator<TreeData | string | symbol, void, boolean> {
    for (let i = 0; i < rootNode.children.length; i++) {
      const schemaNode = rootNode.children[i];
      const isOpened = yield refresh
        ? {
          id: `schemaNode-${schemaNode.name}`,
          isOpenByDefault: true,
          renderData: omit(schemaNode, 'children')
        } : `schemaNode-${schemaNode.name}`;
      if (isOpened) {
        for (let j = 0; j < schemaNode.children.length; j++) {
          const tableNode = schemaNode.children[j];
          yield refresh
            ? {
              id: `tableNode-${tableNode.schemaName}-${tableNode.tableName}`,
              isOpenByDefault: false,
              renderData: tableNode
            } : `tableNode-${tableNode.schemaName}-${tableNode.tableName}`;
        }
      }
    }

  }


  return (
    <Box>
      <HStack justifyContent={"space-between"} m={0} p={0} gap={0}>
      <Flex align="center" mb={2} mt={2}>
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
      </Flex>
      <Text fontSize="sm" color={"minusxGreen.600"} textAlign={"right"} fontWeight={"bold"}>[{totalSelectedFilteredTables} out of {totalFilteredTables} tables selected]</Text>

      </HStack>
      <Box position="relative" width="100%" mb={2} p={0}>
        <Input
          placeholder={`Search table name (${data.length} tables across ${Object.keys(groupedData).length} schemas)`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          borderColor={"minusxGreen.600"}
        />
      </Box>

      <Box maxHeight={"330px"} overflowY={"scroll"} borderWidth="1px" borderRadius="md" mb={2}>
        <VStack spacing={0} align="stretch">
          {
            // NOTE(@arpit): not sure why AutoSizer is not working here. hardcoding height for now
            <FixedSizeTree
              treeWalker={treeWalker}
              itemSize={32}
              height={330}
              width="100%"
            >
              {Node}
            </FixedSizeTree>
          }
          {/* TODO(@arpit): figure out why this no tables component is not rendering */}
          {Object.keys(filteredGroupedData).length === 0 && (
            <Text p={4} textAlign="center" color="gray.500">
              No tables match your search criteria.
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
}