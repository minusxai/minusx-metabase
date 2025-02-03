import React from "react"
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import {Text, Table, Thead, Tbody, Tfoot, Tr, Th, Td, TableCaption, TableContainer, Badge, Tabs, TabList, Tab, TabPanels, TabPanel} from "@chakra-ui/react";

import { Measure, Dimension } from "web/types";

const SLTable = ({table}: {table: Measure[] | Dimension[]}) => {
  return <TableContainer>
  <Table variant='striped' size="sm" style={{whiteSpace: "pre-wrap"}}>
    <Thead>
      <Tr>
        <Th>Column</Th>
        <Th>Description</Th>
      </Tr>
    </Thead>
    <Tbody>
      {table.map((column) => {
        return <Tr>
          <Td>{column.name.split('.').slice(1,2)}</Td>
          <Td>{column.description}</Td>
        </Tr>
      })}
    </Tbody>
  </Table>
</TableContainer>
}

export const DataCatalog: React.FC<null> = () => {
  const availableMeasures = useSelector((state: RootState) => state.semanticLayer.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.semanticLayer.availableDimensions) || []
  const semanticLayer = useSelector((state: RootState) => state.thumbnails.semanticLayer) || ''

  return <>
    <Text fontSize="lg" fontWeight="bold">Logic Store: <Badge fontSize={"18px"} variant={"solid"} colorScheme="minusxGreen">{semanticLayer}</Badge></Text>
    <Tabs isFitted variant='enclosed-colored' colorScheme="minusxGreen" mt={5}>
      <TabList mb='1em'>
        <Tab>Measures</Tab>
        <Tab>Dimensions</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <SLTable table={availableMeasures} />
        </TabPanel>
        <TabPanel>
          <SLTable table={availableDimensions} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </>
}