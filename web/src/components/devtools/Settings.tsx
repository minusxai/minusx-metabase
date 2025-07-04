import { Checkbox, Button, Input, VStack, Text, Link, HStack, Box, Divider, AbsoluteCenter, Stack, Switch, Textarea, Radio, RadioGroup, IconButton, Icon, Tag, TagLabel, Badge } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { dispatch, logoutState, resetState } from '../../state/dispatch';
import { updateIsLocal, updateIsDevToolsOpen, updateUploadLogs, updateDevToolsTabName, DevToolsTabName, setConfirmChanges, setDemoMode, setDRMode, setGroupsEnabled, setModelsMode, setViewAllCatalogs, setEnableHighlightHelpers, setUseMemory, setEnableStyleCustomization, setEnableUserDebugTools, setEnableReviews } from '../../state/settings/reducer';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { configs } from '../../constants';
import { BiLinkExternal } from 'react-icons/bi'
import { setMinusxMode } from '../../app/rpc';
import { BsDiscord } from "react-icons/bs";
import { PortalButton, SubscribeButton, PricingPlans } from '../common/Subscription';
import { getBillingInfo } from '../../app/api/billing';
import { setBillingInfo } from '../../state/billing/reducer';
import { captureEvent, GLOBAL_EVENTS } from '../../tracking';
import CreditsPill from '../common/CreditsPill';
import { SettingsBlock } from '../common/SettingsBlock';
import { GroupViewer } from '../common/GroupViewer';
import { getApp } from '../../helpers/app';
import { SupportButton } from '../common/Support'

export const TelemetryToggle = ({color}:{color: 'minusxBW.800' | 'minusxBW.50'}) => {
  const uploadLogs = useSelector((state: RootState) => state.settings.uploadLogs)
  const setUploadLogs = (value: boolean) => {
    dispatch(updateUploadLogs(value))
  }
  return (
    <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0} width={"100%"}>
      <Text color={color} fontSize="sm">Telemetry & Activity</Text>
      <Switch color={color} colorScheme='minusxGreen' size='md' isChecked={uploadLogs} onChange={(e) => setUploadLogs(e.target.checked)} />
    </Stack>
  )
}

const useAppStore = getApp().useStore()

export const DevToolsToggle: React.FC<{size: 'micro' | 'mini'}> = ({size}) => {
  const devTools = useSelector((state: RootState) => state.settings.isDevToolsOpen)
  const setshowDevTools = async (value: boolean) => {
    console.log('Show Devtools', value)
    dispatch(updateIsDevToolsOpen(value))
    if (value) {
      await setMinusxMode('open-sidepanel-devtools')
    } else {
      await setMinusxMode('open-sidepanel')
    }
  }
  return (
  <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
    <Text color={"minusxBW.800"} fontSize={size=='micro'?"xs":"sm"}>Settings</Text>
    <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size={size=="micro"?"sm":"md"} isChecked={devTools} onChange={(e) => setshowDevTools(e.target.checked)} />
  </Stack>
  )
}

const SettingsPage = () => {
  // const currentApiKey = useSelector(state => state.settings.apiKey)
  // const [apiKey, setApiKey] = React.useState(currentApiKey);
  // const [showPassword, setShowPassword] = React.useState(false);
  const discordLink = 'https://discord.gg/jtFeyPMDcH'
  const confirmChanges = useSelector((state: RootState) => state.settings.confirmChanges)
  const demoMode = useSelector((state: RootState) => state.settings.demoMode)
  const groupsEnabled = useSelector((state: RootState) => state.settings.groupsEnabled)
  const modelsMode = useSelector((state: RootState) => state.settings.modelsMode)
  const viewAllCatalogs = useSelector((state: RootState) => state.settings.viewAllCatalogs)
  const drMode = useSelector((state: RootState) => state.settings.drMode)
  const enableHighlightHelpers = useSelector((state: RootState) => state.settings.enable_highlight_helpers)
  const auth = useSelector((state: RootState) => state.auth)
  const billing = useSelector((state: RootState) => state.billing)
  const tabName = useSelector((state: RootState) => state.settings.devToolsTabName)
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const useMemory = useSelector((state: RootState) => state.settings.useMemory)
  const enableStyleCustomization = useSelector((state: RootState) => state.settings.enableStyleCustomization)
  const enableUserDebugTools = useSelector((state: RootState) => state.settings.enableUserDebugTools)
  const enableReviews = useSelector((state: RootState) => state.settings.enableReviews)

  const reloadBillingInfo = async () => {
    await getBillingInfo().then((billingInfo) => {
      if (billingInfo && billingInfo.subscribed) {
        captureEvent(GLOBAL_EVENTS.billing_subscribed)
      } else {
        captureEvent(GLOBAL_EVENTS.billing_unsubscribed)
      }
      dispatch(setBillingInfo({
        credits: billingInfo.credits,
        isSubscribed: billingInfo.subscribed,
        stripeCustomerId: billingInfo.stripe_customer_id
      }))
    })
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (tabName != 'General Settings'){
        return null;
      }
      reloadBillingInfo()
    }, 5000)
    return () => clearTimeout(timeout)
  })

  const updateConfirmChanges = (value: boolean) => {
    dispatch(setConfirmChanges(value))
  }
  const updateDemoMode = (value: boolean) => {
    dispatch(setDemoMode(value))
  }
  const updateGroupsEnabled = (value: boolean) => {
    dispatch(setGroupsEnabled(value))
  }
  const updateModelsMode = (value: boolean) => {
    dispatch(setModelsMode(value))
  }
  const updateViewAllCatalogs = (value: boolean) => {
    dispatch(setViewAllCatalogs(value))
  }
  const updateDRMode = (value: boolean) => {
    dispatch(setDRMode(value))
  }
  const updateEnableHighlightHelpers = (value: boolean) => {
    dispatch(setEnableHighlightHelpers(value))
  }
  const setDevToolsPage = (value: DevToolsTabName) => {
    dispatch(updateIsDevToolsOpen(true))
    dispatch(updateDevToolsTabName(value))
  }
  const updateUseMemory = (value: boolean) => {
    dispatch(setUseMemory(value))
  }
  const updateEnableStyleCustomization = (value: boolean) => {
    dispatch(setEnableStyleCustomization(value))
  }
  const updateEnableUserDebugTools = (value: boolean) => {
    dispatch(setEnableUserDebugTools(value))
  }
  const updateEnableReviews = (value: boolean) => {
    dispatch(setEnableReviews(value))
  }
  
  // const CURRENT_ACTION_TESTS = ACTION_TESTS[tool];
  return (
    <VStack className='settings-body'
    justifyContent="start"
    alignItems="stretch"
    flex={1}
    // height={'80vh'}
    width={"100%"}
    overflow={"scroll"}
    // pt={2}
    >
      <SettingsBlock title="Profile">
        <VStack alignItems={"stretch"}>
          <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text color={"minusxBW.800"} fontSize="sm">Email</Text>
            <Text color={"minusxBW.800"} fontSize="sm">{auth.email}</Text>
          </Stack>
          <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text color={"minusxBW.800"} fontSize="sm">Subscription</Text>
            <Tag colorScheme={billing.isSubscribed ? 'minusxGreen' : 'minusxBW'} size="md" variant='solid'>
              <TagLabel color={billing.isSubscribed ? 'minusxBW.100' : 'minusxBW.600'}>{billing.isSubscribed ? 'Pro Plan' : 'Free Plan'}</TagLabel>
            </Tag>
          </Stack>
          <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0}>
            <Text color={"minusxBW.800"} fontSize="sm">Credits remaining</Text>
            <CreditsPill credits={billing.credits} onReload={reloadBillingInfo}/>
            {/* <Tag colorScheme={billing.isSubscribed ? 'minusxGreen' : 'minusxBW'} size="md" variant='solid'>
              <TagLabel color={billing.isSubscribed ? 'minusxBW.100' : 'minusxBW.600'}>{billing.isSubscribed ? 'Pro Plan' : 'Free Plan'}</TagLabel>
            </Tag> */}
          </Stack>
          {!billing.isSubscribed && <SubscribeButton />}
          {billing.stripeCustomerId && <PortalButton />}
          <PricingPlans />
          <Text>
            If you encounter any issues, contact us at support@minusx.ai or live support
          </Text>
        </VStack>
      </SettingsBlock>
      {/* <SettingsBlock title="Analytics Tools">
        <VStack alignItems={"stretch"}>
          {Object.entries(ACTIVE_TOOLS).map(([tool, isActive], index) => (
            <Stack direction='row' alignItems={"center"} justifyContent={"space-between"} marginTop={0} key={index}>
              <Text color={"minusxBW.800"} fontSize="sm">{tool}</Text>
              <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={isActive} isDisabled={true}/>
            </Stack>
          ))}
        </VStack>
      </SettingsBlock> */}
      {groupsEnabled && <GroupViewer />}
      <SettingsBlock title="Features" >
        <VStack alignItems="">
          <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">User Confirmation</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={confirmChanges} onChange={(e) => updateConfirmChanges(e.target.checked)} />
          </HStack>
          {configs.IS_DEV && <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Demo Mode</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={demoMode} onChange={(e) => updateDemoMode(e.target.checked)} />
          </HStack>}
          {configs.IS_DEV && <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">View Groups</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={groupsEnabled} onChange={(e) => updateGroupsEnabled(e.target.checked)} />
          </HStack>}
          {/* {configs.IS_DEV && <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Enable Catalog-as-Models</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={modelsMode} onChange={(e) => updateModelsMode(e.target.checked)} />
          </HStack>} */}
          {configs.IS_DEV && <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">View all catalogs</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={viewAllCatalogs} onChange={(e) => updateViewAllCatalogs(e.target.checked)} />
          </HStack>}
          <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Agent Mode</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={drMode} onChange={(e) => updateDRMode(e.target.checked)} />
          </HStack>
          {configs.IS_DEV && <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Highlight Helpers</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={enableHighlightHelpers} onChange={(e) => updateEnableHighlightHelpers(e.target.checked)} />
          </HStack>}
          <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Use Memory</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={useMemory} onChange={(e) => updateUseMemory(e.target.checked)} />
          </HStack>
          <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Style Customization</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={enableStyleCustomization} onChange={(e) => updateEnableStyleCustomization(e.target.checked)} />
          </HStack>
          <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">User Debug Tools</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={enableUserDebugTools} onChange={(e) => updateEnableUserDebugTools(e.target.checked)} />
          </HStack>
          {configs.IS_DEV && <HStack justifyContent={"space-between"}>
            <Text color={"minusxBW.800"} fontSize="sm">Enable Reviews</Text>
            <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={enableReviews} onChange={(e) => updateEnableReviews(e.target.checked)} />
          </HStack>}
        </VStack>
      </SettingsBlock>
      <SettingsBlock title="Privacy">
        <VStack alignItems={"stretch"}>
          <TelemetryToggle color="minusxBW.800"/>
          <Text color={"minusxBW.800"} fontSize="xs">Read a <Link href="https://minusx.ai/privacy-simplified/"
            color="blue" isExternal>simple break-down</Link> about what the logs contain, and what we do with them.</Text>
        </VStack>
      </SettingsBlock>
      {configs.IS_DEV ? <SettingsBlock title="Developer">
      <Stack direction='row' alignItems={"center"} justifyContent={"space-between"}>
          <Text color={"minusxBW.800"} fontSize="sm">Reset State</Text>
          <Button size={"xs"} onClick={() => resetState()} colorScheme="minusxGreen">Reset</Button>
        </Stack>
        <DevToolsToggle size={"mini"}/>
      </SettingsBlock>: null}
      {/* {configs.IS_DEV ? <SettingsBlock title="LLM" >
        <HStack justifyContent={"space-between"}>
          <Text color={"minusxBW.800"} fontSize="sm">Use Local Models</Text>
          <Switch color={"minusxBW.800"} colorScheme='minusxGreen' size='md' isChecked={isLocal} onChange={(e) => setIsLocal(e.target.checked)} />
        </HStack>
        <HStack justifyContent={"space-between"}>
          <Text color={"minusxBW.800"} fontSize="sm">Planner Configs</Text>
          <IconButton size="sm" colorScheme={"minusxGreen"} variant="ghost" aria-label="See Planner Configs" icon={<Icon as={BiLinkExternal} boxSize={4} />} onClick={() =>  {setDevToolsPage('Planner Configs')}} />
        </HStack>
        <HStack justifyContent={"space-between"}>
          <Text color={"minusxBW.800"} fontSize="sm">Context</Text>
          <IconButton size="sm" colorScheme={"minusxGreen"} variant="ghost" aria-label="See Context" icon={<Icon as={BiLinkExternal} boxSize={4} />} onClick={() =>  {setDevToolsPage('Context')}} />
        </HStack>
      </SettingsBlock> : null } */}
      <SettingsBlock title="Support">
        <HStack justifyContent={"space-between"}>
          <HStack>
            <Text color={"minusxBW.800"} fontSize="sm">Live Support </Text>
            {/* <BsDiscord size={18} color={"minusxBW.800"} /> */}
          </HStack>
          {/* <IconButton size="sm" colorScheme={"minusxGreen"} variant="ghost" aria-label="See Prompts" icon={<Icon as={BiLinkExternal} boxSize={4} />} onClick={() =>  window.open(discordLink, '_blank')} /> */}
          <SupportButton email={auth.email || ''}/>
        </HStack>
        <Stack direction='row' alignItems={"center"} justifyContent={"space-between"}>
          <Text color={"minusxBW.800"} fontSize="sm">Chat ID</Text>
          <Badge color={"minusxGreen.600"} size={"xs"}>{activeThread.id}</Badge>
        </Stack>
      </SettingsBlock>
      <Button size={"sm"} p={2} colorScheme="minusxGreen" onClick={() => logoutState()}>Logout</Button>
    </VStack>
  );
};

export default SettingsPage;
