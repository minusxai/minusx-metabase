import React from 'react';
import { HStack, VStack, Text } from '@chakra-ui/react'
import { 
  BiCog, 
  BiTable, 
  BiMemoryCard, 
  BiGroup, 
  BiHistory, 
  BiWrench, 
  BiPalette,
  BiBot,
  BiListUl,
  BiTestTube
} from 'react-icons/bi'
import { DockSwitcher, MonitorDef } from './DockSwitcher';
import { LLMContext } from './LLMContext'
import { Testing } from './Testing'
import { ActionsView } from './ActionDebug';
import Settings from './Settings'
import { configs } from '../../constants';
import { Context } from './Context';
import { MinusXMD } from './Memory';
import { TeamMemory } from './TeamMemory';
import CSSCustomization from './CSSCustomization';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { UserDebugTools } from './UserDebugTools';
import { History } from './History';
import { getParsedIframeInfo } from '../../helpers/origin'
import { useGetUserStateQuery } from '../../app/api/userStateApi';

const Monitors: MonitorDef[] = [
  {
    title: "General Settings",
    component: Settings,
    icon: BiCog,
    tags: ['production']
  },
  {
    title: "Context",
    component: Context,
    icon: BiTable,
    tags: ['production']
  },
  {
    title: "Memory",
    component: MinusXMD,
    icon: BiMemoryCard,
    tags: ['production']
  },
  {
    title: "Team Memory",
    component: TeamMemory,
    icon: BiGroup,
    tags: ['production']
  },
  {
    title: "History",
    component: History,
    icon: BiHistory,
    tags: ['production']
  },
  {
    title: "Debug Tools",
    component: UserDebugTools,
    icon: BiWrench,
    tags: ['production']
  },
  {
    title: "CSS Customization",
    component: CSSCustomization,
    icon: BiPalette,
    tags: ['production']
  },
  {
    title: "Dev Context",
    component: LLMContext,
    icon: BiBot,
  },
  {
    title: "Action History",
    component: ActionsView,
    icon: BiListUl,
  },
  {
    title: "Testing Tools",
    component: Testing,
    icon: BiTestTube
  },
]

export const DevToolsBox: React.FC = () => {
  const { data: userState, isLoading } = useGetUserStateQuery({})
  const isInfoPageEnabled = userState?.flags?.isInfoPageEnabled || false
  const enableStyleCustomization = useSelector((state: RootState) => state.settings.enableStyleCustomization)
  const enableUserDebugTools = useSelector((state: RootState) => state.settings.enableUserDebugTools)
  const isEmbedded = getParsedIframeInfo().isEmbedded as unknown === 'true'

  const monitors = Monitors.filter(Monitor => {
    // Check existing dev/production logic
    const isAllowedByEnv = configs.IS_DEV || Monitor.tags?.includes('production')

    if (isEmbedded && !configs.IS_DEV) {
        if (Monitor.title === 'History' || Monitor.title === 'Memory') {
            return true
        }
        if (isInfoPageEnabled && Monitor.title == 'Debug Tools') {
          return true
        }
        if (isInfoPageEnabled && Monitor.title == 'Context') {
          return true
        }
        return false    
    }
    
    // Special filtering for CSS Customization tab
    if (Monitor.title === 'CSS Customization') {
      return isAllowedByEnv && enableStyleCustomization
    }
    // Special filtering for User Debug Tools tab
    if (Monitor.title === 'Debug Tools') {
        return isAllowedByEnv && enableUserDebugTools
    }
    
    return isAllowedByEnv
  })
  console.log("Load assets here")
  return (
    <VStack
    //   px="4"
    //   pt="4"
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