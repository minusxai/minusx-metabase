import React from 'react';
import { HStack, VStack, Text } from '@chakra-ui/react'
import { DockSwitcher, MonitorDef } from './DockSwitcher';
import { LLMContext } from './LLMContext'
// import { LLMContextHistory } from './LLMContextHistory'
import { PlannerConfigs } from './PlannerConfigs'
import { Testing } from './Testing'
import { CustomInstructions } from './CustomInstructions'
import { DataCatalog } from './DataCatalog'
import { ActionsView } from './ActionDebug';
import Settings from './Settings'
import { configs } from '../../constants';
import { Context } from './Context';

const Monitors: MonitorDef[] = [
  {
    title: "General Settings",
    component: Settings,
    tags: ['production']
  },
  {
    title: "Context",
    component: Context,
    tags: ['production']
  },
//   {
//     title: "Custom Instructions",
//     component: CustomInstructions,
//     tags: ['production']
//   },
//   {
//     title: "Data Catalog",
//     component: DataCatalog,
//   },
//   {
//     title: "Planner Configs",
//     component: PlannerConfigs,
//     // tags: ['production']
//   },
  {
    title: "Dev Context",
    component: LLMContext,
    // tags: ['production']
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
]

export const DevToolsBox: React.FC = () => {
  const monitors = Monitors.filter(Monitor => {
    if (configs.IS_DEV) {
      return true
    }
    return Monitor.tags?.includes('production') || false
  })
  console.log("Load assets here")
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
        <Text fontSize={"xs"}>Settings</Text>
      </HStack>
    </VStack>
  )
}