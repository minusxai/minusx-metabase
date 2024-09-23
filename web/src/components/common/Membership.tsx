import React, { useEffect } from 'react';
import {
    Button,
    Text,
  } from '@chakra-ui/react'
import { update_profile } from '../../state/auth/reducer';
import { dispatch } from '../../state/dispatch';

export const MembershipBlock = () => {
    useEffect(() => {
        setTimeout(() => {
            dispatch(update_profile({ credits_expired: false }))
        }, 3000)
    })
    const finishPayment = () => {

    }
    return <Text>
        Blocked. Please pay to continue.
        <Button onClick={finishPayment}>Pay</Button>
    </Text>
}