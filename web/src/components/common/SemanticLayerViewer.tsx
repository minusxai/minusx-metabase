import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
  VStack,
  Text,
  FormControl, FormLabel, Tooltip
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
import  { executeAction } from '../../planner/plannerActions'

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

const Members = ({ members, selectedMembers, memberType }: { members: any[], selectedMembers: string[], memberType: string }) => {
  //todo: vivek - clean this up
  //available members (measures and dimensions) are arrays of objects with name and description
  //used members (measures and dimensions) are arrays of strings
  //used filters are arrays of objects with member, operator, and values
  const createAvailableOptions = (members: any[]) => members.map((member: any) => ({ value: member.name, label: member.name, description: member.description }))
  // const createUsedOptions = (members: string[], memberType: string) => members.map((member: any) => ({ value: member, label: memberType === 'Filters' ? `${member.member} = ${JSON.stringify(member.values)}` : member }))
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
      tagColorScheme={ colorMap[memberType].color }
      size={'sm'}
      value={createUsedOptions(selectedMembers, memberType)}
      onChange={setterFn}
      components={components}
    />
  </FormControl>)
}


export const SemanticLayerViewer = () => {
  const availableMeasures = useSelector((state: RootState) => state.settings.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.settings.availableDimensions) || []
  const usedMeasures = useSelector((state: RootState) => state.settings.usedMeasures) || []
  const usedDimensions = useSelector((state: RootState) => state.settings.usedDimensions) || []
  const usedFilters = useSelector((state: RootState) => state.settings.usedFilters) || []

  useEffect(() => {
    executeAction({
      index: -1,
      function: 'applySemanticQuery',
      args: JSON.stringify({
        measures: usedMeasures,
        dimensions: usedDimensions,
        filters: usedFilters
      })
    })
  }, [usedMeasures, usedDimensions, usedFilters])

  return (
    <VStack>
      <Text fontSize='md' fontWeight={800}>Semantic Layer Viewer</Text>
      <Members members={availableMeasures} selectedMembers={usedMeasures} memberType='Measures' />
      <Members members={availableDimensions} selectedMembers={usedDimensions} memberType='Dimensions' />
      <Members members={usedFilters} selectedMembers={usedFilters} memberType='Filters' />
    </VStack>
  )
}
