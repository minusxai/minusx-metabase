import {
  VStack,
  HStack,
  IconButton,
  Icon,
  Text,
  Image,
  Tooltip,
  Spacer
} from '@chakra-ui/react'
import logo from '../../assets/img/logo.svg'
import React, { forwardRef, useEffect, useState } from 'react'
import Settings, {DevToolsToggle} from './Settings'
import AddtionalContext from './AdditionalContext'
import TaskUI from './TaskUI'
import { BiCog, BiMessage, BiFolder, BiFolderOpen } from 'react-icons/bi'
import { useSelector } from 'react-redux'
import { register } from '../../state/auth/reducer'
import { dispatch } from '../../state/dispatch'
import {auth as authModule} from '../../app/api'
import Auth from './Auth'
import _ from 'lodash'
import { updateAppMode, updateSidePanelTabName } from '../../state/settings/reducer'
import { DevToolsBox } from '../devtools';
import { RootState } from '../../state/store'
import { getPlatformShortcut } from '../../helpers/platformCustomization'
import { getParsedIframeInfo } from '../../helpers/origin'
import { getApp } from '../../helpers/app'
import { getBillingInfo } from '../../app/api/billing'
import { setBillingInfo } from '../../state/billing/reducer'
import { setAvailableMeasures, setAvailableDimensions } from '../../state/semantic-layer/reducer'
import { SupportButton } from './Support'
import { Markdown } from './Markdown'
import { toggleMinusXRoot } from '../../app/rpc'
import { configs } from '../../constants'
import axios from 'axios'

const SEMANTIC_PROPERTIES_API = `${configs.SEMANTIC_BASE_URL}/properties`

const useAppStore = getApp().useStore()

const AppInstructions = () => {
  const addonsMenu = `${configs.WEB_URL}/screenshots/addons-menu.png`
  const addonsSearch = `${configs.WEB_URL}/screenshots/addons-search.png`
  const addonsInstall = `${configs.WEB_URL}/screenshots/addons-install.png`
  const addonsActivate = `${configs.WEB_URL}/screenshots/addons-activate.png`
  const addonsUnavailable = `${configs.WEB_URL}/screenshots/addons-unavailable.png`
  const addOnStatus = useAppStore((state) => state.addOnStatus)
  useEffect(() => {
    if (addOnStatus == 'activated') {
      toggleMinusXRoot('closed', true)
    }
  }, [addOnStatus])
  const installInstructions = `### Almost there.
You need to add the MinusX Sheets add-on to enable MinusX:
1. Select the Add-ons menu in Google Sheets

![Add-ons menu](${addonsMenu})

2. Search for MinusX in the add-ons store

![Add-ons search](${addonsSearch})

3. Install the MinusX add-on. You're all set!

![Add-ons install](${addonsInstall})

4. If you cannot find the MinusX add-on in the menu, try this [direct link](https://workspace.google.com/u/0/marketplace/app/minusx/1001122509846). You might have to refresh the page.
`
  const activateInstructions = `### MinusX is Installed!
You can activate the MinusX Sheets add-on from the extensions menu:

![Add-ons activate](${addonsActivate})
`

  const unavailableInstructions = `### MinusX is unavailable in this document.
  This may be due to the following reasons:
  1. Document is of type .XLSX . Google only supports extensions on native Google Sheets so you'll have to convert the document to Google Sheets using the 'Save as Google Sheets' button in the File menu (creates a copy):
![Add-ons unavailable](${addonsUnavailable})
`
  const loadingInstructions = `### Evaluating.`
  const activatedInstructions = `### MinusX is fully active!`
  const instructions = addOnStatus == undefined ?
   loadingInstructions :
   addOnStatus == 'unavailable' ? unavailableInstructions :
   addOnStatus == 'uninstalled' ? installInstructions : 
   addOnStatus == 'deactivated' ? activateInstructions : activatedInstructions
  return (
    <VStack
      px="4"
      pt="4"
      fontSize="sm"
      w={`${width}px`}
      height="100%"
      gap={0}
      backgroundColor={"minusxBW.200"}
      borderColor={"minusxBW.200"}
      borderWidth={1.5}
      borderLeftColor={"minusxBW.500"}
      alignItems={"start"}
      overflowY={"scroll"}
    >
      <Markdown content={instructions}/>
    </VStack>
  )
}

const AppLoggedIn = forwardRef((_props, ref) => {
  const email = useSelector((state: RootState) => state.auth.email)
  const tool = getParsedIframeInfo().tool
  const toolVersion = getParsedIframeInfo().toolVersion
  const isSheets = tool == 'google' && toolVersion == 'sheets'
  useEffect(() => {
    getBillingInfo().then(billingInfo => {
      dispatch(setBillingInfo({
        credits: billingInfo.credits,
        isSubscribed: billingInfo.subscribed,
        stripeCustomerId: billingInfo.stripe_customer_id
      }))
    })
  }, [])
  const sidePanelTabName = useSelector((state: RootState) => state.settings.sidePanelTabName)
  const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)
  const platformShortcut = getPlatformShortcut()
  const width = getParsedIframeInfo().width

  return (
    <VStack
      px="4"
      pt="4"
      fontSize="sm"
      w={`${width}px`}
      height="100%"
      gap={0}
      backgroundColor={"minusxBW.200"}
      borderColor={"minusxBW.200"}
      borderWidth={1.5}
      borderLeftColor={"minusxBW.500"}
    >
      <VStack justifyContent="start" alignItems="stretch" width="100%">
        <HStack
          borderBottomColor={'minusxBW.500'}
          borderBottomWidth={1}
          borderBottomStyle={'solid'}
          justifyContent={'space-between'}
          paddingBottom={2}
        >
          <Image src={logo} alt="MinusX" maxWidth='150px'/>
          <HStack>
            <Tooltip hasArrow label="Chat" placement='bottom' borderRadius={5} openDelay={500}>
              <IconButton
                variant={sidePanelTabName === 'chat' ? 'solid' : 'ghost'}
                colorScheme="minusxGreen"
                aria-label="Chat"
                size={'sm'}
                icon={<Icon as={BiMessage} boxSize={5} />}
                onClick={() => dispatch(updateSidePanelTabName('chat'))}
              />
            </Tooltip>
            <Tooltip hasArrow label="Additional Context" placement='bottom' borderRadius={5} openDelay={500}>
              <IconButton
                variant={sidePanelTabName === 'context' ? 'solid' : 'ghost'}
                colorScheme="minusxGreen"
                aria-label="Additional Context"
                size={'sm'}
                icon={<Icon as={BiFolderOpen} boxSize={5} />}
                onClick={() => dispatch(updateSidePanelTabName('context'))}
              />
            </Tooltip>
            <Tooltip hasArrow label="Settings" placement='bottom' borderRadius={5} openDelay={500}>
              <IconButton
              variant={sidePanelTabName === 'settings' ? 'solid' : 'ghost'}
              colorScheme="minusxGreen"
              aria-label="Settings"
              size={'sm'}
              icon={<Icon as={BiCog} boxSize={5} />}
              onClick={() => dispatch(updateSidePanelTabName('settings'))}
              />
            </Tooltip>
          </HStack>
        </HStack>
      </VStack>
      {sidePanelTabName === 'chat' ? <TaskUI ref={ref} /> : null}
      {sidePanelTabName === 'context' ? <AddtionalContext /> : null}
      {sidePanelTabName === 'settings' ? <Settings /> : null}
      <HStack justifyContent="space-between" alignItems="center" width="100%" py="1">
        {/* {configs.IS_DEV ? <DevToolsToggle size={"micro"}/> : null} */}
        { !isSheets && <DevToolsToggle size={"micro"}/>}
        { !isSheets && <Text fontSize="xs" color="minusxGreen.800" fontWeight={"bold"}>{platformShortcut} to toggle</Text>}
        <SupportButton email={email} />
      </HStack>
    </VStack>
  )
})

const width = getParsedIframeInfo().width
function DisabledOverlayComponent({ toolEnabledReason }: { toolEnabledReason: string }) {
  const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)
  return <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: isDevToolsOpen ? '850px' : `${width}px`, // Hack to fix Disabled Overlay
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
  }}>
      <span style={{
          fontSize: '1rem',
          fontWeight: 'bold',
          color: '#fff',
          padding: '10px 20px',
          margin: '10px',
          backgroundColor: '#34495e',
          borderRadius: '5px',
          textAlign: 'center'
      }}>
          {toolEnabledReason}
      </span>
  </div>
}

const AppBody = forwardRef((_props, ref) => {
  const auth = useSelector((state: RootState) => state.auth)
  const appMode = useSelector((state: RootState) => state.settings.appMode)
  const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)
  const toolEnabled = useAppStore((state) => state.isEnabled)
  const variant = getParsedIframeInfo().variant
  useEffect(() => {
    if (appMode == 'selection') {
      dispatch(updateAppMode('sidePanel'))
    }
  }, []) 
  useEffect(() => {
    console.log('Session token is', auth.session_jwt)
    if (_.isUndefined(auth.session_jwt)) {
      authModule.register().then((data) => {
        console.log('registered', data)
        const { session_jwt } = data
        dispatch(register(session_jwt))
      }).catch(err => {
        console.log('register error is', err)
      })
    }
  }, [auth.session_jwt])
  useEffect(() => {
      const fetchData = async () => {
          const response = await axios.get(SEMANTIC_PROPERTIES_API, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          const data = await response.data
          dispatch(setAvailableMeasures(data.measures || []))
          dispatch(setAvailableDimensions(data.dimensions || []))
      }
      if (auth.session_jwt) {
        const MAX_TRIES = 3
        const tryFetchingSemanticLayer = async (tries = 1) => {
          if (tries <= MAX_TRIES) {
            try {
              await fetchData()
            } catch (err) {
              console.warn(`Failed to retrieve semantic properties, try ${tries}`, err)
              setTimeout(() => tryFetchingSemanticLayer(tries + 1), 1000*tries)
            }
          }
        }
        tryFetchingSemanticLayer()
      }
  }, [auth.session_jwt])
  // const IFrameButton = (<IconButton 
  //   borderRightRadius={0} aria-label="Home"
  //   icon={<MinusxButtonIcon />} backgroundColor={"minusxBW.200"}
  //   onClick={()=>enableSideChat()} borderWidth={1.5}
  //   borderLeftColor={"minusxBW.500"} borderRightColor={"transparent"}
  //   borderTopColor={"minusxBW.500"} borderBottomColor={"minusxBW.500"}/>
  // )
  if (!auth.is_authenticated) {
    return <Auth />
  }

  if (appMode === 'selection') {
    return (
      <HStack zIndex={999999} position={"absolute"} width={"100%"} textAlign={"center"} left={"0px"} bottom={"10px"} justifyContent={"center"}>
        <Text p={2} borderRadius={5} bg={"minusxBW.50"} color='minusxGreen.800' width={"60%"}
          fontSize="30px" fontWeight={"bold"}>Press Esc to exit "Select & Ask" mode</Text>
      </HStack>
    )
  }

  if (variant === 'instructions') {
    return <AppInstructions />
  }

  if (appMode === 'sidePanel') {
    return (
      <>
        {isDevToolsOpen && <DevToolsBox />}
        {!toolEnabled.value && <DisabledOverlayComponent toolEnabledReason={toolEnabled.reason} />}
        <AppLoggedIn ref={ref}/>
      </>
    )
  }
})

const App = forwardRef((_props, ref) => {
  return <HStack gap={0} height={"100vh"} id="minusx-iframe-content" float={"right"}>
    <AppBody ref={ref} />
  </HStack>
})

export default App