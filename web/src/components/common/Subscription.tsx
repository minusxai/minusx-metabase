import React, { useEffect } from 'react'
import { Button, Text, VStack, Link } from '@chakra-ui/react'
import { configs } from '../../constants'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import { HiMiniSparkles } from "react-icons/hi2";
import { captureEvent, GLOBAL_EVENTS } from '../../tracking'

export const SubscribeButton = () => {
  const auth = useSelector((state: RootState) => state.auth)
  const logCheckout = () => {
    captureEvent(GLOBAL_EVENTS.billing_checkout)
  }
  return <form onSubmit={logCheckout} action={`${configs.SERVER_BASE_URL}/billing/checkout`} method="post">
    <input type="hidden" name="session_jwt" value={auth.session_jwt} />
    <Button colorScheme="minusxGreen" type='submit' formTarget='_blank' width="100%"
     size={"sm"} p={2} >Upgrade to Pro <HiMiniSparkles/></Button>
  </form>
}

export const PortalButton = () => {
  const auth = useSelector((state: RootState) => state.auth)
  const logPortal = () => {
    captureEvent(GLOBAL_EVENTS.billing_portal)
  }
  return <form onSubmit={logPortal} action={`${configs.SERVER_BASE_URL}/billing/portal`} method="post">
    <input type="hidden" name="session_jwt" value={auth.session_jwt} />
    <Button colorScheme="minusxGreen" type='submit' formTarget='_blank' width="100%" size={"sm"} p={2}>
      Manage Billing
    </Button>
  </form>
}

export const PricingPlans = () => {
  return <Link width={"100%"} textAlign={"center"} href="https://minusx.ai/#pricing"
  color="blue" isExternal>Explore pricing plans, features</Link>
}