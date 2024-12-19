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
} from 'chakra-react-select';

import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { setUsedMeasures, setUsedDimensions, setUsedFilters } from '../../state/settings/reducer'
import { dispatch } from "../../state/dispatch"
import { executeAction } from '../../planner/plannerActions'

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
        <Tooltip label={props.data.description} placement="right" hasArrow>
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
    backgroundColor="rgba(220, 220, 220, 0.7)"
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
  const availableMeasures = useSelector((state: RootState) => state.settings.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.settings.availableDimensions) || []
  const usedMeasures = useSelector((state: RootState) => state.settings.usedMeasures) || []
  const usedDimensions = useSelector((state: RootState) => state.settings.usedDimensions) || []
  const usedFilters = useSelector((state: RootState) => state.settings.usedFilters) || []

  useEffect(() => {
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
    <Box position="relative">
      {isLoading && <LoadingOverlay />}
      <VStack>
        <Text fontSize='md' fontWeight={800}>Semantic Layer Viewer</Text>
        <Members members={availableMeasures} selectedMembers={usedMeasures} memberType='Measures' />
        <Members members={availableDimensions} selectedMembers={usedDimensions} memberType='Dimensions' />
        <Members members={usedFilters} selectedMembers={usedFilters} memberType='Filters' />
      </VStack>
    </Box>
  )
}