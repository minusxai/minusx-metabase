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
import { setAvailableMeasures, setAvailableDimensions, setUsedMeasures, setUsedDimensions, setUsedFilters, setUsedTimeDimensions, setUsedOrder } from '../../state/settings/reducer'
import { dispatch } from "../../state/dispatch"
import { executeAction } from '../../planner/plannerActions'
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { SettingsBlock } from './SettingsBlock';
import axios from 'axios';
import { configs } from '../../constants'


const SEMANTIC_PROPERTIES_API = configs.SERVER_BASE_URL + "/semantic/properties"

interface Option {
  label: string;
  value: string;
  description?: string;
}

type MemberType = 'Measures' | 'Dimensions' | 'Filters' | 'TimeDimensions' | 'Order'

const SemanticMemberMap: Record<'Measures' | 'Dimensions' | 'Filters' | 'TimeDimensions' | 'Order', {color: string, setter: any}> = {
  Measures: {color: 'yellow', setter: setUsedMeasures},
  Dimensions: {color: 'blue', setter: setUsedDimensions},
  Filters: {color: 'red', setter: setUsedFilters},
  TimeDimensions: {color: 'purple', setter: setUsedTimeDimensions},
  Order: {color: 'gray', setter: setUsedOrder}
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

const Members = ({ members, selectedMembers, memberType }: { members: any[], selectedMembers: string[], memberType: MemberType }) => {
  const createAvailableOptions = (members: any[]) => members.map((member: any) => ({ value: member.name, label: member.name, description: member.description }))
  const createUsedOptions = (members: string[], memberType: string) => members.map((member: any) => {
    if (memberType === 'Filters') {
      return { value: member, label: member.member.split(".").at(-1) }
    }
    else if (memberType === 'TimeDimensions') {
      return { value: member, label: `${member.dimension.split(".").at(-1)} | ${member.granularity}` }
    }
    else if (memberType === 'Order') {
      return { value: member, label: `${member[0].split(".").at(-1)} | ${member[1]}` }
    }
    return { value: member, label: member.split(".").at(-1) }
  })
  
  const setterFn = (selectedOptions: any) => dispatch(SemanticMemberMap[memberType].setter(selectedOptions.map((option: any) => option.value)))
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
  const [runButton, setRunButton] = useState(false);
  const [clearButton, setClearButton] = useState(false);
  const availableMeasures = useSelector((state: RootState) => state.settings.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.settings.availableDimensions) || []
  const usedMeasures = useSelector((state: RootState) => state.settings.usedMeasures) || []
  const usedDimensions = useSelector((state: RootState) => state.settings.usedDimensions) || []
  const usedFilters = useSelector((state: RootState) => state.settings.usedFilters) || []
  const usedTimeDimensions = useSelector((state: RootState) => state.settings.usedTimeDimensions) || []
  const usedOrder = useSelector((state: RootState) => state.settings.usedOrder) || []

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
      setRunButton(false);
    }
  };

  const clearQuery = async () => {
    for (const memberType in SemanticMemberMap) {
      dispatch(SemanticMemberMap[memberType as MemberType].setter([]))
    }
    setRunButton(false);
  };
  
  useEffect(() => {
    setRunButton(true);
    if (usedMeasures.length || usedDimensions.length || usedFilters.length || usedTimeDimensions.length || usedOrder.length) {
      setClearButton(true);
    }
    else {
      setClearButton(false);
    }
  }, [usedMeasures, usedDimensions, usedFilters, usedTimeDimensions, usedOrder]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(SEMANTIC_PROPERTIES_API, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const data = await response.data
      dispatch(setAvailableMeasures(data.measures || []))
      dispatch(setAvailableDimensions(data.dimensions || []))
    }
    try {
      fetchData()
    } catch (err) {
      console.log('Error is', err)
    }
  }, [])

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
          <Button size={"xs"} onClick={() => applyQuery()} colorScheme="minusxGreen" isDisabled={!runButton} flex={3}>Run Query</Button>
          <Button size={"xs"} onClick={() => clearQuery()} colorScheme="minusxGreen" isDisabled={!clearButton} flex={1}>Clear</Button>
        </HStack>
        <VStack>
          <Box>
            <Members members={availableMeasures} selectedMembers={usedMeasures} memberType='Measures' />
            <Members members={availableDimensions} selectedMembers={usedDimensions} memberType='Dimensions' />
            {/* Todo: Vivek: Filters is precarious. The below component assumes the simple list form and not the complex object form.*/}
            <Members members={usedFilters} selectedMembers={usedFilters} memberType='Filters' />
            <Members members={usedTimeDimensions} selectedMembers={usedTimeDimensions} memberType='TimeDimensions' />
            <Members members={usedOrder} selectedMembers={usedOrder} memberType='Order' />
          </Box>
        </VStack>
      </SettingsBlock>
    </Box>
    </ResizableBox>
  )
}