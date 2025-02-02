import React, { useState } from "react";
import { Box, Table, Thead, Tbody, Tr, Th, Td, Checkbox, Input } from "@chakra-ui/react";
import { FormattedTable } from 'apps/types';



export const FilteredTable = ({ data, selectedData }: {data: FormattedTable[], selectedData: FormattedTable[]}) => {
    console.log(data, selectedData)
    const [selectedNames, setSelectedNames] = useState<string[]>([]);
    const [search, setSearch] = useState("");

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

    const selectedDat1a = data.filter((item) => selectedNames.includes(item.name));

    return (
    <Box p={4}>
        <Box position="relative" width="300px" mb={4}>
        <Input
            placeholder="Search names..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
        {search && suggestions.length > 0 && (
            <Box
            position="absolute"
            zIndex="1"
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            width="100%"
            mt={1}
            borderRadius="md"
            boxShadow="sm"
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

        <Table variant="simple">
        <Thead>
            <Tr>
            <Th>Selected</Th>
            <Th>Name</Th>
            <Th>Description</Th>
            </Tr>
        </Thead>
        <Tbody>
            {selectedData.map((item) => (
            <Tr key={item.name}>
                <Td>
                <Checkbox
                    isChecked
                    onChange={() => handleRemove(item.name)}
                />
                </Td>
                <Td>{item.name}</Td>
                <Td>{item.description}</Td>
            </Tr>
            ))}
        </Tbody>
        </Table>
    </Box>
  );
}
