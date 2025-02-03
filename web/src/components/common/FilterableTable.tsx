import React, { useState } from "react";
import { Box, Table, Thead, Tbody, Tr, Th, Td, Checkbox, Input, Text, Divider } from "@chakra-ui/react";
import { FormattedTable } from 'apps/types';



export const FilteredTable = ({ data, selectedData, searchKey, displayKeys }: {data: FormattedTable[], selectedData: FormattedTable[], searchKey: string, displayKeys: string[]}) => {
    const [search, setSearch] = useState("");
    const [selectedNames, setSelectedNames] = useState(selectedData.map((item) => item.name));
    const [isFocused, setIsFocused] = useState(false);

    const suggestions = data.filter(
    (item) =>
        !selectedNames.includes(item.name) &&
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = (name: string) => {
        setSelectedNames([...selectedNames, name]);
        setSearch("");
    };

    const handleRemove = (name: string) => {
        setSelectedNames(selectedNames.filter((n) => n !== name));
    };

    const selectedDataDisplay = data.filter((item) => selectedNames.includes(item.name));

    return (
    <Box>
        <Box position="relative" width="100%" mb={4} mt={4} p={1}>
            <Input
                placeholder={`Search Table (${data.length - selectedData.length} more available tables)`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                borderColor={"minusxGreen.600"}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />
            {isFocused && suggestions.length > 0 && (
                <Box
                position="absolute"
                zIndex="1"
                bg="white"
                border="1px solid"
                borderColor="gray.200"
                width="100%"
                borderRadius="md"
                borderTopRadius={0}
                boxShadow="sm"
                maxHeight={"300px"}
                overflowY="auto"
                >
                {suggestions.map((item) => (
                    <Box
                    key={item.name}
                    p={2}
                    cursor="pointer"
                    _hover={{ bg: "gray.100" }}
                    onClick={() => handleAdd(item.name)}
                    >
                    {item.name}
                    </Box>
                ))}
                </Box>
            )}
        </Box>

        <Table variant="striped" size="md">
        <Thead>
            <Tr>
                <Th>Selected</Th>
                {displayKeys.map((key) => (
                    <Th key={key}>{key}</Th>
                ))}
            </Tr>
        </Thead>
        <Tbody>
            {selectedDataDisplay.map((item) => (
            <Tr key={item.name}>
                <Td>
                <Checkbox
                    isChecked
                    onChange={() => handleRemove(item.name)}
                />
                </Td>
                {displayKeys.map((key) => (
                    <Td key={key}>{item[key]}</Td>
                ))}
            </Tr>
            ))}
        </Tbody>
        </Table>
        <Divider/>
        <Text fontSize="sm" textAlign={"right"} color={"minusxGreen.600"} fontWeight={"bold"} mt={2}>{selectedDataDisplay.length} out of {data.length} tables selected</Text>
    </Box>
  );
}
