import React, { useEffect, useState } from "react"
import { Text, Box, } from "@chakra-ui/react";
import { getParsedIframeInfo } from "../../helpers/origin"
import _ from 'lodash';
import { AdditionalContext } from '../common/AdditionalContext';

export const MinusXMD: React.FC = () => {
    const tool = getParsedIframeInfo().tool
    if (tool != 'metabase') {
        return <Text>Coming soon!</Text>
    }

    return <>
        <Text fontSize="2xl" fontWeight="bold">minusx.md</Text>
        <AdditionalContext />
    </>
}