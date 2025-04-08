import React from "react"
import { TablesContext } from '../common/TablesContext';
import { FormattedTable, MetabaseContext } from 'apps/types';
import { getApp } from '../../helpers/app';
import { getParsedIframeInfo } from "../../helpers/origin"
import { isEmpty } from 'lodash';
import { Text, Box, Badge, Link, Select} from "@chakra-ui/react";
import { applyTableDiff, TableInfo, setSelectedContext } from "../../state/settings/reducer";
import { dispatch, } from '../../state/dispatch';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { applyTableDiffs } from "apps";

const useAppStore = getApp().useStore()



export const Context: React.FC<null> = () => {
    const selectedContext = useSelector((state: RootState) => state.settings.selectedContext)
    const availableContexts = useSelector((state: RootState) => state.settings.availableContexts)
    return <>
        <Text fontSize="lg" fontWeight="bold">Context</Text>
        <Select placeholder="Select a context" mt={2} colorScheme="minusxGreen" value={selectedContext} onChange={(e) => {dispatch(setSelectedContext(e.target.value))}}>
            {
                availableContexts.map((context: any) => {
                    return <option key={context.value} value={context.value} selected={selectedContext === context.value}>{context.name}</option>
                })
            }
        </Select>
        {
            selectedContext === "tables" && <TablesContext />
        }
    </>
}