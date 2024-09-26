import React, { useEffect } from 'react'
import { Button, Text, VStack } from '@chakra-ui/react'
import { update_profile } from '../../state/auth/reducer'
import { dispatch } from '../../state/dispatch'
import { configs } from '../../constants'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'

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
    })
}

export const SubscribeButton = () => {
  const auth = useSelector((state: RootState) => state.auth)
  return <form action={`${configs.SERVER_BASE_URL}/billing/checkout`} method="post">
    <input type="hidden" name="session_jwt" value={auth.session_jwt} />
    <Button colorScheme="minusxGreen" type='submit' formTarget='_blank' width="100%">Subscribe</Button>
  </form>
}

export const PortalButton = () => {
  const auth = useSelector((state: RootState) => state.auth)
  return <form action={`${configs.SERVER_BASE_URL}/billing/portal`} method="post">
    <input type="hidden" name="session_jwt" value={auth.session_jwt} />
    <Button colorScheme="minusxGreen" type='submit' formTarget='_blank' width="100%">Manage Billing</Button>
  </form>
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
    <SubscribeButton />
  </VStack>
}

export const RefreshButton = () => {
  return <Button onClick={refreshProfile}>Refresh</Button>
}
