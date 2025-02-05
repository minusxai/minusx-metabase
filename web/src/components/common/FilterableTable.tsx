import React, { useState } from "react";
import { Box, Table, Thead, Tbody, Tr, Th, Td, Checkbox, Input, Divider, Badge } from "@chakra-ui/react";
import { FormattedTable } from 'apps/types';
import { TableInfo } from "../../state/settings/reducer";
import _ from "lodash";

type TableUpdateFn = (value: TableInfo) => void;

export const FilteredTable = ({ dbId, data, selectedData, addFn, removeFn }: {dbId: number, data: FormattedTable[], selectedData: FormattedTable[], addFn: TableUpdateFn, removeFn: TableUpdateFn}) => {

    const searchKey = 'name'
    const displayKeys = ['name', 'description']
    const [search, setSearch] = useState("");
    
    const handleAdd = (item: FormattedTable) => {
        addFn({
            name: item.name,
            schema: item.schema,
            dbId: dbId
        });
    };

    const handleRemove = (item: FormattedTable) => {
        removeFn({
            name: item.name,
            schema: item.schema,
            dbId: dbId
        });
    }

    const displayRows = data.filter((item) => {
        if (search.length === 0) {
            return true;
        }
        return item[searchKey].toLowerCase().includes(search.toLowerCase());
    }).sort((a, b) => selectedData.some((n) => n.name === a.name) ? -1 : 1);

    return (
    <Box>
        <Box position="relative" width="100%" mb={4} mt={4} p={1}>
            <Input
                placeholder={`Search table name (${data.length} tables)`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                borderColor={"minusxGreen.600"}
            />

        </Box>
        <Box  maxHeight={"375px"} overflow={"scroll"}>
        <Table variant="striped" size="md">
        <Thead>
            <Tr>
                <Th textAlign={"center"} >Selected</Th>
                {displayKeys.map((key) => (
                    <Th textAlign={"center"}  key={key}>{key}</Th>
                ))}
            </Tr>
        </Thead>
        <Tbody>
            {displayRows.map((item) => (
            <Tr key={item.id + '_' + item.name + '_CBOX'}>
                <Td textAlign={"center"} >
                    <Checkbox
                        isChecked={selectedData.some((n) => n.name === item.name)}
                        onChange={(e) => {
                            if (e.target.checked) {
                                handleAdd(item);
                            } else {
                                handleRemove(item);
                            }
                        }}
                    />
                </Td>
                <Td textAlign={"center"} key={item.id + '_' + item.name + "_NAME"}>{item.name}<br></br><Badge color={"minusxGreen.600"}>SCHEMA: {item.schema}</Badge></Td>
                <Td textAlign={"center"} key={item.id + '_' + item.name + "_DESC"}>{item.description}</Td>
                
            </Tr>
            ))}
        </Tbody>
        </Table>
        </Box>
        <Divider/>
    </Box>
  );
}
