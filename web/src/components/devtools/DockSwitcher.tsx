import React from 'react'
import { VStack, Box, Flex, Tooltip } from '@chakra-ui/react'
import { RootState } from '../../state/store'
import { DevToolsTabName, updateDevToolsTabName } from '../../state/settings/reducer' 
import { useDispatch, useSelector } from 'react-redux';

export type MonitorDef = {
  component: React.FC<any>
  title: DevToolsTabName
  icon?: React.ComponentType
  tags?: string[]
}

export const DockSwitcher: React.FC<{monitors: MonitorDef[]}> = ({ monitors }) => {
    const activeTabName = useSelector((state: RootState) => state.settings.devToolsTabName)
    const dispatch = useDispatch()
    
    if (!monitors) {
      return null
    }
    
    const handleTabClick = (tabName: DevToolsTabName) => {
      dispatch(updateDevToolsTabName(tabName))
    }
    
    const activeMonitor = monitors.find(monitor => monitor.title === activeTabName)
    const ActiveComponent = activeMonitor?.component

    return (
      <Flex width={"100%"} height="100%">
        {/* Sidebar Navigation */}
        <VStack 
          spacing={1} 
          width="60px" 
          minWidth="60px"
          borderRight="1px solid"
          borderRightColor="minusxBW.300"
          py={2}
          px={1}
        >
          {monitors.map((monitor) => {
            const isActive = monitor.title === activeTabName
            const IconComponent = monitor.icon
            
            return (
              <Tooltip 
                key={monitor.title}
                label={monitor.title} 
                placement="right" 
                hasArrow
                bg="gray.700"
                color="white"
                fontSize="sm"
              >
                <Box
                  width="100%"
                  p={2}
                  cursor="pointer"
                  borderRadius="md"
                  bg={isActive ? "minusxGreen.600" : "transparent"}
                  color={isActive ? "minusxBW.100" : "minusxBW.800"}
                  // _hover={{
                  //   bg: isActive ? "minusxGreen.200" : "minusxBW.300"
                  // }}
                  onClick={() => handleTabClick(monitor.title)}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                >
                  {IconComponent && (
                    <Box fontSize="18px">
                      <IconComponent />
                    </Box>
                  )}
                </Box>
              </Tooltip>
            )
          })}
        </VStack>
        
        {/* Content Panel */}
        <Box flex={1} overflowY="auto" height="95vh"  p="4" pt="4" pb="2">
          {ActiveComponent && <ActiveComponent />}
        </Box>
      </Flex>
    )
}