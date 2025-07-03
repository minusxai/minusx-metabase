import React from "react"
import { Text, VStack, Button, HStack} from "@chakra-ui/react";
import { SettingsBlock } from "../common/SettingsBlock";
import { getApp } from "../../helpers/app";
import { getDashboardAppState } from '../../../../apps/src/metabase/helpers/dashboard/appState';

const useAppStore = getApp().useStore()


const downloadAction = (content: string, name: string) => {
    const blob = new Blob([content], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    a.remove()
  }




export const UserDebugTools: React.FC = () => {
    const pageType = useAppStore((state) => state.toolContext.pageType)
    return <>
        <VStack mb={4} alignItems={"stretch"} spacing={2} width="100%">
            <Text fontSize="2xl" fontWeight="bold">User Debug Tools</Text>
            <Text > Tools for users to debug and look into Metabase internal workings</Text>
            { pageType === 'dashboard' &&
            <SettingsBlock title="Dashboard Debug">
                <HStack spacing={2} justifyContent="space-between">
                <Text >Download Dashboard State</Text>
                <Button colorScheme='minusxGreen' size="xs" onClick={async () => {
                    const state = await getDashboardAppState();
                    downloadAction(JSON.stringify(state, null, 2), 'dashboard.json')
                }}>Download</Button>
                </HStack>
            </SettingsBlock>}
        </VStack>
    </>
}