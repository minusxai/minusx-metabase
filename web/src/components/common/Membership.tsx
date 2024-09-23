import React, { useEffect } from 'react'
import { Button, Text, VStack } from '@chakra-ui/react'
import { update_profile } from '../../state/auth/reducer'
import { dispatch } from '../../state/dispatch'
import { configs } from '../../constants'
import axios from 'axios'

const url = `${configs.AUTH_BASE_URL}/profile`

const refreshProfile = () => {
  axios
    .get(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(async (response) => {
      const jsonResponse = await response.data
      console.log('Profile response is', jsonResponse)
      dispatch(
        update_profile({
          membership: jsonResponse.membership,
          credits_expired: jsonResponse.credits_expired,
        })
      )
    })
}

export const UpgradeMembershipButton = () => {
  useEffect(() => {
    refreshProfile()
  })
  return (
    <Button onClick={() => window.open('https://minusx.ai/pricing', '_blank')}>
      Upgrade Membership
    </Button>
  )
}

export const MembershipBlock = () => {
  useEffect(() => {
    const interval = setInterval(() => {
        refreshProfile()
    }, 2000)
    return () => clearInterval(interval)
  })
  return <VStack>
    <Text>Please upgrade your membership to continue</Text>
    {/* <RefreshButton /> */}
    <UpgradeMembershipButton />
  </VStack>
}

export const RefreshButton = () => {
  return <Button onClick={refreshProfile}>Refresh</Button>
}
