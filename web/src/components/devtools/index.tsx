import React from 'react';
import { HStack, VStack, Text } from '@chakra-ui/react'
import { DockSwitcher, MonitorDef } from './DockSwitcher';
import { LLMContext } from './LLMContext'
import { Testing } from './Testing'
import { ActionsView } from './ActionDebug';
import Settings from './Settings'
import { configs } from '../../constants';
import { Context } from './Context';
import { MinusXMD } from './Memory';
import CSSCustomization from './CSSCustomization';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';

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
  {
    title: "Memory",
    component: MinusXMD,
    tags: ['production']
  },
  {
    title: "CSS Customization",
    component: CSSCustomization,
    tags: ['production']
  },
  {
    title: "Dev Context",
    component: LLMContext,
  },
  {
    title: "Action History",
    component: ActionsView,
  },
  {
    title: "Testing Tools",
    component: Testing
  },
]

export const DevToolsBox: React.FC = () => {
  const enableStyleCustomization = useSelector((state: RootState) => state.settings.enableStyleCustomization)
  
  const monitors = Monitors.filter(Monitor => {
    // Check existing dev/production logic
    const isAllowedByEnv = configs.IS_DEV || Monitor.tags?.includes('production')
    
    // Special filtering for CSS Customization tab
    if (Monitor.title === 'CSS Customization') {
      return isAllowedByEnv && enableStyleCustomization
    }
    
    return isAllowedByEnv
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