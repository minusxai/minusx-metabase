import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
  VStack,
  Text,
  Tag, TagLabel, TagCloseButton,
  FormControl, FormLabel
} from '@chakra-ui/react'
import { Select } from 'chakra-react-select';

import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { setUsedMeasures, setUsedDimensions, setUsedFilters } from '../../state/settings/reducer'
import { dispatch } from "../../state/dispatch"
import  { executeAction, ExecutableAction } from '../../planner/plannerActions'


const colorMap: Record<'Measures' | 'Dimensions' | 'Filters', {color: string, setter: any}> = {
  Measures: {color: 'yellow', setter: setUsedMeasures},
  Dimensions: {color: 'blue', setter: setUsedDimensions},
  Filters: {color: 'red', setter: setUsedFilters}
}

const Members = ({ members, selectedMembers, memberType }: { members: any[], selectedMembers: string[], memberType: string }) => {
  const setterFn = (selectedOptions: any) => dispatch(colorMap[memberType].setter(selectedOptions.map((option: any) => option.value)))
  return (<FormControl px={2} py={1}>
    <FormLabel fontSize={"sm"}>
      {memberType}
    </FormLabel>
    <Select
      isMulti
      name={memberType}
      options={members.map((member: any) => ({ value: member.name, label: member.name }))}
      placeholder={`No ${memberType} selected`}
      variant='filled'
      tagVariant='solid'
      tagColorScheme={ colorMap[memberType].color }
      size={'sm'}
      value={selectedMembers.map((member: any) => ({ value: member, label: member }))}
      onChange={setterFn}
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

  const usedFiltersView = usedFilters.map((f: any)=> `${f.member} = ${JSON.stringify(f.values)}`)
  return (
    <VStack>
      <Text fontSize='md' fontWeight={800}>Semantic Layer Viewer</Text>
      <Members members={availableMeasures} selectedMembers={usedMeasures} memberType='Measures' />
      <Members members={availableDimensions} selectedMembers={usedDimensions} memberType='Dimensions' />
      {/* <Members members={usedFiltersView} selectedMembers={usedFiltersView} memberType='Filters' /> */}
    </VStack>
  )
}
