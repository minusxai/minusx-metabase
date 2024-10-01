import React, { useState, useEffect } from 'react';
import { Box, VStack, Text, Stack, RadioGroup,
  HStack, Radio } from '@chakra-ui/react';
import PlannerConfig from '../common/PlannerConfig';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { getApp } from '../../helpers/app';
import { ToolPlannerConfig } from 'apps/types';

export const PlannerConfigs: React.FC<null> = () => {
  const defaultPlannerConfig = getApp().useStore().getState().llmConfigs.default
  const [resolvedPlannerConfigs, setResolvedPlannerConfigs] = useState<ToolPlannerConfig>(defaultPlannerConfig)
  // const dispatch = useDispatch()
  useEffect(() => {
    (async () => {
      const plannerConfig = await getApp().getPlannerConfig()
      setResolvedPlannerConfigs(plannerConfig)
    })();
  }, [])
  // const currentPlannerConfigIdx = useSelector((state: RootState) => state.toolConfig.tools[tool].plannerConfigIdx)
  // const changeActivePlannerConfig = (active: number) => {
  //   console.log("setting active planner config to", active);
  //   dispatch(setPlannerConfigIdx({
  //     tool,
  //     idx: active
  //   }))
  // }
  
  // const allPlannerConfigsRenderable = resolvedPlannerConfigs?.map((plannerConfig, index) => {
  //   return (
  //     <HStack key={index} bg="minusxBW.300" borderRadius={5} p={2} my={2}>
  //       <Radio value={index.toString()} />
  //       <PlannerConfig plannerConfig={plannerConfig}/>
  //     </HStack>)
  // })
  
  
  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold">Planner Config</Text>
      <VStack borderRadius={10} alignItems={"stretch"}>
        <Stack direction='row' alignItems={"center"} justifyContent={"space-between"}>
          <VStack width={"100%"}>
            {/* <RadioGroup w={"100%"} onChange={value => changeActivePlannerConfig(parseInt(value))} value={currentPlannerConfigIdx.toString()}> */}
              {/* {allPlannerConfigsRenderable} */}
              <PlannerConfig plannerConfig={resolvedPlannerConfigs}/>
            {/* </RadioGroup> */}
          </VStack>
        </Stack>
      </VStack>
    </Box>
  )
}