import React from 'react';
import { HStack, VStack, Text } from '@chakra-ui/react'
import { DockSwitcher, MonitorDef } from './DockSwitcher';
import { LLMContext } from './LLMContext'
// import { LLMContextHistory } from './LLMContextHistory'
import { PlannerConfigs } from './PlannerConfigs'
import { Testing } from './Testing'
import { CustomInstructions } from './CustomInstructions'
import { ActionsView } from './ActionDebug';
import { configs } from '../../constants';

const Monitors: MonitorDef[] = [
  {
    title: "Planner Configs",
    component: PlannerConfigs,
    // tags: ['production']
  },
  {
    title: "Context",
    component: LLMContext,
    tags: ['production']
  },
  {
    title: "Action History",
    component: ActionsView,
  },
  // {
  //   title: "Context History",
  //   component: LLMContextHistory
  // },
  {
    title: "Testing Tools",
    component: Testing
  },
  {
    title: "Add Instructions",
    component: CustomInstructions
  },
]

export const DevToolsBox: React.FC = () => {
  const monitors = Monitors.filter(Monitor => {
    if (configs.IS_DEV) {
      return true
    }
    return Monitor.tags?.includes('production') || false
  })
  return (
    <VStack
      px="4"
      pt="4"
      fontSize="sm"
      w="500px"
      height="100%"
      gap={0}
      backgroundColor={"minusxBW.200"}
      borderWidth={1.5}
      borderLeftColor={"minusxBW.500"}
      borderRightColor={"transparent"}
      justifyContent={"space-between"}
      >
      <DockSwitcher monitors={monitors} />
      <HStack justifyContent="space-between" alignItems="center" width="100%" p="1" borderTop={"1px solid"} borderTopColor={"minusxBW.500"}>
        <Text fontSize={"xs"}>DevTools</Text>
      </HStack>
    </VStack>
  )
}