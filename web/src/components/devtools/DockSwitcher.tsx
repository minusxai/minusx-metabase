import React from 'react'
import { Tabs, TabList, TabPanels, Tab, TabPanel, Box } from '@chakra-ui/react'
import { RootState } from '../../state/store'
import { DevToolsTabName, updateDevToolsTabName } from '../../state/settings/reducer' 
import { useDispatch, useSelector } from 'react-redux';

export type MonitorDef = {
  component: React.FC<any>
  title: DevToolsTabName
  tags?: string[]
}

export const DockSwitcher: React.FC<{monitors: MonitorDef[]}> = ({ monitors }) => {
    // const tabName = getState().settings.devToolsTabName
    const tabName = useSelector((state: RootState) => state.settings.devToolsTabName)
    const dispatch = useDispatch()
    if (!monitors) {
      return null
    }
    const handleTabchange = (index: number) => {
      dispatch(updateDevToolsTabName(monitors[index].title))
    }
    const tabHeaders = monitors.map((monitor) => {
      const title = monitor['title']
      return <Tab key={title} style={{whiteSpace: "nowrap"}}>{title}</Tab>
    })
    const tabPanels = monitors.map((monitor) => {
      const title = monitor['title']
      const Component = monitor['component']
      return (
        <TabPanel key={title} px={0} py={0}>
          <Component />
        </TabPanel>
      )
    }) 
    const tabIdx = monitors.findIndex((monitor) => {
      return monitor.title === tabName
    })

    return (
      <Box width={"100%"}>
        <Tabs colorScheme='minusxGreen' onChange={handleTabchange} index={tabIdx}>
          <TabList borderColor="transparent" overflowX={"scroll"}>
            {tabHeaders}
          </TabList>
          <TabPanels overflowY={"scroll"} h="85vh">
            {tabPanels}
          </TabPanels>
        </Tabs>
      </Box>
    )
}