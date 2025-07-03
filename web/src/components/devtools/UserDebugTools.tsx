import React from "react"
import { Text, VStack, Button, HStack} from "@chakra-ui/react";
import { SettingsBlock } from "../common/SettingsBlock";
import { getApp } from "../../helpers/app";
import { getDashboardState } from "apps";


const useAppStore = getApp().useStore()


const downloadState = async (pageType: string) => {
    const state = await getApp().getState();
    if (pageType === 'dashboard') {
        const dashboardState = await getDashboardState();
        if (dashboardState) {
            state.rawDashboardState = dashboardState;
        }
    }
    const content = JSON.stringify(state, null, 2)
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const name = state?.name || `${pageType}_state`
    a.download = `${name}.json`
    a.click()
    a.remove()
  }

export const UserDebugTools: React.FC = () => {
    const pageType = useAppStore((state) => state.toolContext.pageType)
    return <>
        <VStack mb={4} alignItems={"stretch"} spacing={2} width="100%">
            <Text fontSize="2xl" fontWeight="bold">User Debug Tools</Text>
            <Text > Tools for users to debug and look into Metabase internal workings</Text>
            { pageType != 'unknown' &&
            <SettingsBlock title="State Debug">
                <HStack spacing={2} justifyContent="space-between">
                <Text >{`Download ${pageType.charAt(0).toUpperCase() + pageType.slice(1)} State`}</Text>
                <Button colorScheme='minusxGreen' size="xs" onClick={async() => await downloadState(pageType)}>Download</Button>
                </HStack>
            </SettingsBlock>}
        </VStack>
    </>
}