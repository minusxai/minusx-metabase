import React from "react"
import { Text, VStack } from "@chakra-ui/react";
import { TablesCatalog } from '../common/TablesCatalog';

export const Context: React.FC = () => {
    return (
        <VStack spacing={6} align="stretch" pt={6}>
            <Text fontSize="2xl" fontWeight="bold">Context</Text>
            <TablesCatalog />
        </VStack>
    )
}