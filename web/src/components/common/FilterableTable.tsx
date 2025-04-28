import React, { useState, useMemo, useCallback } from "react";
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
    Spacer
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FormattedTable } from 'apps/types';
import { TableInfo } from "../../state/settings/reducer";
import _, { set } from "lodash";

type TableUpdateFn = (value: TableInfo) => void;

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
    const [expandedSchemas, setExpandedSchemas] = useState<{ [key: string]: boolean }>({});

    const groupedData = useMemo(() => {
        return _.groupBy(data, 'schema');
    }, [data]);

    useMemo(() => {
        setExpandedSchemas(
            Object.keys(groupedData).reduce((acc, schema) => {
                acc[schema] = true;
                return acc;
            }, {} as { [key: string]: boolean })
        );
    }, [groupedData]);


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


    const toggleSchemaExpansion = useCallback((schema: string) => {
        setExpandedSchemas(prev => ({
            ...prev,
            [schema]: !prev[schema]
        }));
    }, []);

    const handleTableCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, item: FormattedTable) => {
        const tableInfo = { name: item.name, schema: item.schema, dbId: dbId };
        if (e.target.checked) {
            addFn(tableInfo);
        } else {
            removeFn(tableInfo);
        }
        setClicks(1);
    }, [addFn, removeFn, dbId]);

    const handleSchemaCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, schema: string, tablesInSchema: FormattedTable[]) => {
        console.log("Schema checkbox changed:", schema, e.target.checked);
        if (e.target.checked) {
            tablesInSchema.forEach(table => {
                if (!selectedSet.has(`${table.schema}/${table.name}`)) {
                     addFn({ name: table.name, schema: table.schema, dbId: dbId });
                }
            });
        } else {
            tablesInSchema.forEach(table => {
                 if (selectedSet.has(`${table.schema}/${table.name}`)) {
                    removeFn({ name: table.name, schema: table.schema, dbId: dbId });
                 }
            });
        }
        setClicks(1);
    }, [addFn, removeFn, dbId, selectedSet]);


    return (
        <Box>
            <Box position="relative" width="100%" mb={2} mt={2} p={0}>
                <Input
                    placeholder={`Search table name (${data.length} tables across ${Object.keys(groupedData).length} schemas)`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    borderColor={"minusxGreen.600"}
                />
            </Box>

            <Box maxHeight={"330px"} overflowY={"scroll"} borderWidth="1px" borderRadius="md" mb={2}>
                <VStack spacing={0} align="stretch">
                    {Object.entries(filteredGroupedData).map(([schema, tables]) => {
                        const tablesInThisFilteredSchema = tables;
                        const selectedInSchemaCount = tablesInThisFilteredSchema.filter(table =>
                            selectedSet.has(`${schema}/${table.name}`)
                        ).length;

                        const isAllSelected = selectedInSchemaCount === tablesInThisFilteredSchema.length && tablesInThisFilteredSchema.length > 0;
                        const isIndeterminate = selectedInSchemaCount > 0 && selectedInSchemaCount < tablesInThisFilteredSchema.length;
                        const isExpanded = expandedSchemas[schema] ?? false;

                        return (
                            <Box key={schema} borderBottomWidth="1px" borderColor="gray.200">
                                <Flex
                                    align="center"
                                    p={2}
                                    bg="gray.50"
                                    cursor="pointer"
                                    onClick={() => toggleSchemaExpansion(schema)}
                                    _hover={{ bg: "gray.100" }}
                                >
                                    <Checkbox
                                        isChecked={isAllSelected}
                                        isIndeterminate={isIndeterminate}
                                        onChange={(e) => handleSchemaCheckboxChange(e, schema, tablesInThisFilteredSchema)}
                                        onClick={(e) => e.stopPropagation()}
                                        mr={3}
                                        colorScheme="minusxGreen"
                                    />
                                    <IconButton
                                        aria-label={isExpanded ? "Collapse schema" : "Expand schema"}
                                        icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                        size="sm"
                                        variant="subtle"
                                        mr={2}
                                    />
                                    <Text fontWeight="bold">schema: <Badge color="minusxGreen.600">{schema}</Badge></Text>
                                    <Spacer />
                                    <Badge color="minusxGreen.600">{tables.length} tables</Badge>
                                </Flex>

                                <Collapse in={isExpanded} animateOpacity>
                                     {isExpanded && (
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th width="50px" textAlign="center"></Th>
                                                    <Th>Table</Th>
                                                    <Th>Description</Th>
                                                </Tr>
                                            </Thead>

                                            <Tbody>
                                                {tables.map((item) => (
                                                    <Tr key={`${item.schema}/${item.name}`}>
                                                        <Td width="50px" textAlign="center">
                                                            <Checkbox
                                                                isChecked={selectedSet.has(`${item.schema}/${item.name}`)}
                                                                onChange={(e) => handleTableCheckboxChange(e, item)}
                                                                colorScheme="minusxGreen"
                                                            />
                                                        </Td>
                                                        <Td >{item.name}</Td>
                                                        <Td>{item.description ?? '-'}</Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                     )}
                                </Collapse>
                            </Box>
                        );
                    })}
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