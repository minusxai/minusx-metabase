import { Text } from '@chakra-ui/react';
import React, { useEffect } from "react"
import AdditionalContext from "../common/AdditionalContext"
import { getParsedIframeInfo } from "../../helpers/origin"
import { SemanticLayer } from '../common/SemanticLayer';
import { getApp } from '../../helpers/app';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from "@chakra-ui/react";
import { configs } from '../../constants';

const useAppStore = getApp().useStore()

const DataTable = ({ data }: {data: FormattedTable[]}) => {
  if (!data || data.length === 0) {
    return null
  }
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Description</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item, index) => (
            <Tr key={index}>
              <Td>{item.name}</Td>
              <Td>{item.description || ""}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

const MetabaseContextFC = () => {
  const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
  const tool = getParsedIframeInfo().tool
  if (tool != 'metabase') {
    return null
  }
  const relevantTables = toolContext.relevantTables
  return <>
    <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Metabase Context</Text>
    <Text color={"minusxBW.600"} fontSize="xs">Visible tables from database ID: {toolContext.dbId}</Text>
    <DataTable data={relevantTables} />
  </>
}

export const CustomInstructions: React.FC<null> = () => {
  const tool = getParsedIframeInfo().tool
  if (tool == 'metabase') {
    return <>
      {configs.IS_DEV && <MetabaseContextFC />}
      <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Custom Instructions</Text>
      <Text color={"minusxBW.600"} fontSize="xs">Adding custom instructions (including important queries & descriptions) allows MinusX to generate correct answers to your questions.</Text>
      <AdditionalContext />
    </>
  //   return <>
  //     <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Semantic Layer</Text>
  //     <Text color={"minusxBW.600"} fontSize="xs">Providing MinusX with important queries and descriptions that can be composed allows MinusX to generate more relevant queries to your answers.</Text>
  //     <SemanticLayer />
  //   </>
  }
  return <>
    <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Custom Instructions</Text>
    <Text color={"minusxBW.600"} fontSize="xs">Custom instructions allow you to share anything you'd like MinusX to consider while thinking.
    The instructions are specific to the app you're using (Metabase, Sheets, etc.).</Text>
    <AdditionalContext />
  </>
}