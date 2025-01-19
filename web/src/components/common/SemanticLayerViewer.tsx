import React, { forwardRef, useCallback, useEffect, useState } from 'react'
import {
  VStack,
  HStack,
  Text,
  FormControl, FormLabel, Tooltip,
  Spinner,
  Box,
  Center,
  Button,
  Editable, EditablePreview, EditableTextarea
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
import { setAvailableMeasures, setAvailableDimensions, setAvailableLayers } from '../../state/semantic-layer/reducer'
import { setSemanticLayer } from '../../state/thumbnails/reducer'
import { dispatch } from "../../state/dispatch"
import { executeAction } from '../../planner/plannerActions'
import { SettingsBlock } from './SettingsBlock';
import _, { create, isEmpty } from 'lodash';
import axios from 'axios'
import { configs } from '../../constants'

const SEMANTIC_PROPERTIES_API = `${configs.SEMANTIC_BASE_URL}/properties`
const SEMANTIC_LAYERS_API = `${configs.SEMANTIC_BASE_URL}/layers`

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
    alignItems="start"
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
        mt={16}
      />
    </Center>
  </Box>
);

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

const Members = ({ members, memberType }: { members: any[], memberType: MemberType }) => {
  const semanticQuery = useSelector((state: RootState) => state.thumbnails.semanticQuery)
  const selectedMembers = semanticQuery[memberType]
  
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
      menuPosition='fixed'
    />
  </FormControl>)
}

export const SemanticLayerViewer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const availableMeasures = useSelector((state: RootState) => state.semanticLayer.availableMeasures) || []
  const availableDimensions = useSelector((state: RootState) => state.semanticLayer.availableDimensions) || []
  const availableLayers = useSelector((state: RootState) => state.semanticLayer.availableLayers) || []
  const semanticQuery = useSelector((state: RootState) => state.thumbnails.semanticQuery)
  const semanticLayer = useSelector((state: RootState) => state.thumbnails.semanticLayer) || ''
  const isEmptySemanticQuery = _.every(_.values(semanticQuery).map(_.isEmpty))

  const showSemanticQueryJSON = true;

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

  const updateSemanticQueryFromJson = (value: string) => {
    try {
      dispatch(setSemanticQuery(JSON.parse(value)))
    } catch (e) {
      console.error(e)
    }
  }

  const fetchLayer = async (layer: any) => {
    const measures = []
    const dimensions = []
    let semanticLayerTemp = null
    if (layer) {
      semanticLayerTemp = layer.value
      const response = await axios.get(SEMANTIC_PROPERTIES_API, {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          layer: semanticLayerTemp
        }
      })
      const data = await response.data
      measures.push(...data.measures)
      dimensions.push(...data.dimensions)
    }
    dispatch(setSemanticLayer(semanticLayerTemp))
    dispatch(setAvailableMeasures(measures))
    dispatch(setAvailableDimensions(dimensions))

  }

  useEffect(() => {
    const fetchData = async () => {
        const response = await axios.get(SEMANTIC_LAYERS_API, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        const data = await response.data
        dispatch(setAvailableLayers(data.layers || []))
        if (semanticLayer === ''){
          fetchLayer({'value': data.layers[0].name})
        }
    }
    const MAX_TRIES = 3
    const tryFetchingSemanticLayer = async (tries = 1) => {
      if (tries <= MAX_TRIES) {
        try {
          await fetchData()
        } catch (err) {
          console.warn(`Failed to retrieve semantic properties, try ${tries}`, err)
          setTimeout(() => tryFetchingSemanticLayer(tries + 1), 1000*tries)
        }
      }
    }
    
    tryFetchingSemanticLayer()
  }, [])

  return (
    <Box position='relative' overflow="scroll" maxHeight={"300px"}>
      <SettingsBlock title='Semantic Layer'>
      <Select
        isClearable
        name={'layers'}
        options={createAvailableOptions(availableLayers)}
        placeholder={`Select Semantic Layer`}
        variant='filled'
        size={'sm'}
        value={{ value: semanticLayer, label: semanticLayer }}
        onChange={fetchLayer}
        components={components}
        menuPosition='fixed'
      />
        <HStack>
          <Button size={"xs"} onClick={() => applyQuery()} colorScheme="minusxGreen" isDisabled={isEmptySemanticQuery || isLoading} flex={3}>Run Query</Button>
          <Button size={"xs"} onClick={() => dispatch(resetSemanticQuery())} colorScheme="minusxGreen" isDisabled={isEmptySemanticQuery || isLoading} flex={1}>Clear</Button>
        </HStack>
        <VStack overflow={"scroll"} position={"relative"}>
          { isLoading && <LoadingOverlay />}
          <Box width={"100%"}>
            <Members members={availableMeasures} memberType='measures' />
            <Members members={availableDimensions} memberType='dimensions' />
            {/* Todo: Vivek: Filters is precarious. The below component assumes the simple list form and not the complex object form.*/}
            <Members members={semanticQuery.filters} memberType='filters' />
            <Members members={semanticQuery.timeDimensions} memberType='timeDimensions' />
            <Members members={semanticQuery.order} memberType='order' />
            { showSemanticQueryJSON && <Editable value={JSON.stringify(semanticQuery, null, 2)}
              mt={3} width={"100%"} justifyContent={"center"} display={"flex"}
              alignItems={"stretch"} borderRadius={5} borderColor={"#aaa"} borderWidth={1}
              bg="#fefefe" onChange={updateSemanticQueryFromJson}
              >
              <EditablePreview whiteSpace="pre-wrap" fontFamily="monospace" p={3} minHeight={150} width={"100%"}/>
              <EditableTextarea whiteSpace="pre-wrap" fontFamily="monospace" p={3} minHeight={150}/>
            </Editable>
            }
          </Box>
        </VStack>
      </SettingsBlock>
    </Box>
  )
}