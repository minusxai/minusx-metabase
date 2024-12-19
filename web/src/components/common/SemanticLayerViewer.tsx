import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
  VStack,
  Text,
  FormControl, FormLabel, Tooltip,
  Spinner,
  Box,
  Center
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
import { setUsedMeasures, setUsedDimensions, setUsedFilters } from '../../state/settings/reducer'
import { dispatch } from "../../state/dispatch"
import { executeAction } from '../../planner/plannerActions'
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';
import { SettingsBlock } from './SettingsBlock';
interface Option {
  label: string;
  value: string;
  description?: string;
}

const colorMap: Record<'Measures' | 'Dimensions' | 'Filters', {color: string, setter: any}> = {
  Measures: {color: 'yellow', setter: setUsedMeasures},
  Dimensions: {color: 'blue', setter: setUsedDimensions},
  Filters: {color: 'red', setter: setUsedFilters}
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
        <Tooltip label={JSON.stringify(props.data.value)} placement="top" hasArrow>
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

const Members = ({ members, selectedMembers, memberType }: { members: any[], selectedMembers: string[], memberType: string }) => {
  const createAvailableOptions = (members: any[]) => members.map((member: any) => ({ value: member.name, label: member.name, description: member.description }))
  const createUsedOptions = (members: string[], memberType: string) => members.map((member: any) => ({ value: member, label: memberType === 'Filters' ? member.member : member }))
  
  const setterFn = (selectedOptions: any) => dispatch(colorMap[memberType].setter(selectedOptions.map((option: any) => option.value)))
  return (<FormControl px={2} py={1}>
    <FormLabel fontSize={"sm"}>
      {memberType}
    </FormLabel>
    <Select
      isMulti
      name={memberType}
      options={createAvailableOptions(members)}
      placeholder={`No ${memberType} selected`}
      variant='filled'
      tagVariant='solid'
      tagColorScheme={colorMap[memberType].color}
      size={'sm'}
      value={createUsedOptions(selectedMembers, memberType)}
      onChange={setterFn}
      components={components}
    />
  </FormControl>)
}

export const SemanticLayerViewer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const availableMeasures = useSelector((state: RootState) => state.settings.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.settings.availableDimensions) || []
  const usedMeasures = useSelector((state: RootState) => state.settings.usedMeasures) || []
  const usedDimensions = useSelector((state: RootState) => state.settings.usedDimensions) || []
  const usedFilters = useSelector((state: RootState) => state.settings.usedFilters) || []

  useEffect(() => {
    if (!hasMounted) {
      // Todo Sreejith: is this correct?
      setHasMounted(true);
      return;
    }
    const applyQuery = async () => {
      setIsLoading(true);
      try {
        await executeAction({
          index: -1,
          function: 'applySemanticQuery',
          args: JSON.stringify({
            measures: usedMeasures,
            dimensions: usedDimensions,
            filters: usedFilters
          })
        });
      } finally {
        setIsLoading(false);
      }
    };

    applyQuery();
  }, [usedMeasures, usedDimensions, usedFilters]);

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
        <VStack>
          <Box>
            <Members members={availableMeasures} selectedMembers={usedMeasures} memberType='Measures' />
            <Members members={availableDimensions} selectedMembers={usedDimensions} memberType='Dimensions' />
            <Members members={usedFilters} selectedMembers={usedFilters} memberType='Filters' />
          </Box>
        </VStack>
      </SettingsBlock>
    </Box>
    </ResizableBox>
  )
}