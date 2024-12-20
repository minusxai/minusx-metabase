import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
  VStack,
  HStack,
  Text,
  FormControl, FormLabel, Tooltip,
  Spinner,
  Box,
  Center,
  Button
} from '@chakra-ui/react'
import {
  GroupBase,
  Select,
  SelectComponentsConfig,
  chakraComponents,
  ChakraStylesConfig,
} from 'chakra-react-select';

import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { resetSemanticQuery, SemanticQuery, setSemanticQuery } from '../../state/thumbnails/reducer';
import { dispatch } from "../../state/dispatch"
import { executeAction } from '../../planner/plannerActions'
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { SettingsBlock } from './SettingsBlock';
import _, { isEmpty } from 'lodash';

interface Option {
  label: string;
  value: string;
  description?: string;
}

type MemberType = keyof SemanticQuery

const SemanticMemberMap: Record<MemberType, {color: string}> = {
  measures: {color: 'yellow'},
  dimensions: {color: 'blue'},
  filters: {color: 'red'},
  timeDimensions: {color: 'purple'},
  order: {color: 'gray'}
}

const components: SelectComponentsConfig<Option, true, GroupBase<Option>> = {
  Option: ({ children, ...props }) => {
    return (
      <chakraComponents.Option {...props}>
        <Tooltip label={props.data.description} placement="top" hasArrow maxWidth={200}>
          <span>{children}</span>
        </Tooltip>
      </chakraComponents.Option>
    );
  },
  MultiValueLabel: ({ children, ...props }) => {
    return (
      <chakraComponents.MultiValueLabel {...props}>
        <Tooltip label={JSON.stringify(props.data.value)} placement="top" hasArrow maxWidth={200}>
          <span>{children}</span>
        </Tooltip>
      </chakraComponents.MultiValueLabel>
    );
  },
};

const LoadingOverlay = () => (
  <Box
    p={0}
    position="absolute"
    top={0}
    left={0}
    right={0}
    bottom={0}
    backgroundColor="rgba(250, 250, 250, 0.7)"
    zIndex={1000}
    display="flex"
    alignItems="center"
    justifyContent="center"
    borderRadius={5}
    // Todo: Sreejith: The Loading overlay is not covering the full screen. Need to fix this!!!
    // height={500}
  >
    <Center>
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color={"minusxGreen.500"}
        size="xl"
      />
    </Center>
  </Box>
);

const Members = ({ members, memberType }: { members: any[], memberType: MemberType }) => {
  const semanticQuery = useSelector((state: RootState) => state.thumbnails.semanticQuery)
  const selectedMembers = semanticQuery[memberType]
  const createAvailableOptions = (members: any[]) => members.map((member: any) => ({ value: member.name, label: member.name, description: member.description }))
  const createUsedOptions = (members: string[], memberType: string) => members.map((member: any) => {
    if (memberType === 'filters') {
      return { value: member, label: member.member?.split(".").at(-1) }
    }
    else if (memberType === 'timeDimensions') {
      return { value: member, label: `${member.dimension?.split(".").at(-1)} | ${member.granularity}` }
    }
    else if (memberType === 'order') {
      return { value: member, label: `${member[0]?.split(".").at(-1)} | ${member[1]}` }
    }
    return { value: member, label: member?.split(".").at(-1) }
  })
  
  const setterFn = (selectedOptions: any) => dispatch(setSemanticQuery({[memberType]: selectedOptions.map((option: any) => option.value)}))
  return (<FormControl px={2} py={1}>
    <FormLabel fontSize={"sm"}>
      <HStack width={"100%"} justifyContent={"space-between"}>
        <Box>{memberType}</Box>
        <Text fontSize={'xs'}>{`(${selectedMembers.length} / ${members.length})`}</Text>
      </HStack>
    </FormLabel>
    <Select
      isMulti
      name={memberType}
      options={createAvailableOptions(members)}
      placeholder={`No ${memberType} selected`}
      variant='filled'
      tagVariant='solid'
      tagColorScheme={SemanticMemberMap[memberType].color}
      size={'sm'}
      value={createUsedOptions(selectedMembers, memberType)}
      onChange={setterFn}
      components={components}
    />
  </FormControl>)
}

export const SemanticLayerViewer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const availableMeasures = useSelector((state: RootState) => state.semanticLayer.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.semanticLayer.availableDimensions) || []
  const semanticQuery = useSelector((state: RootState) => state.thumbnails.semanticQuery)
  const isEmptySemanticQuery = _.every(_.values(semanticQuery).map(_.isEmpty))

  const applyQuery = async () => {
    setIsLoading(true);
    try {
      await executeAction({
        index: -1,
        function: 'applySemanticQuery',
        args: "{}"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResizableBox
      width={Infinity}
      height={300}
      minConstraints={[Infinity, 200]}
      maxConstraints={[Infinity, 400]}
      resizeHandles={['n']}
      handle={<div className="resizer" style={{
        position: "absolute",
        top: "0",
        width: "100%",
        height: "1px",
        background: "#d6d3d1",
        cursor: "ns-resize",
      }}/>}
      axis="y"
      style={{ paddingTop: '10px', position: 'relative'}}
    >
    <Box position='relative' overflow={"scroll"} height={"100%"}>
      { isLoading && <LoadingOverlay />}
      <SettingsBlock title='Semantic Layer'>
        <HStack pt={2}>
          <Button size={"xs"} onClick={() => applyQuery()} colorScheme="minusxGreen" isDisabled={isEmptySemanticQuery} flex={3}>Run Query</Button>
          <Button size={"xs"} onClick={() => dispatch(resetSemanticQuery())} colorScheme="minusxGreen" isDisabled={isEmptySemanticQuery} flex={1}>Clear</Button>
        </HStack>
        <VStack>
          <Box>
            <Members members={availableMeasures} memberType='measures' />
            <Members members={availableDimensions} memberType='dimensions' />
            {/* Todo: Vivek: Filters is precarious. The below component assumes the simple list form and not the complex object form.*/}
            <Members members={semanticQuery.filters} memberType='filters' />
            <Members members={semanticQuery.timeDimensions} memberType='timeDimensions' />
            <Members members={semanticQuery.order} memberType='order' />
          </Box>
        </VStack>
      </SettingsBlock>
    </Box>
    </ResizableBox>
  )
}