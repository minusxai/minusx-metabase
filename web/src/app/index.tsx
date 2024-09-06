import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import ChakraContext from '../components/common/ChakraContext';
import App from '../components/common/App';
import { persistStore } from 'redux-persist';
import { RootState, store } from '../state/store';
import { setIframeInfo, updateIsAppOpen } from '../state/settings/reducer';
import { dispatch } from '../state/dispatch';
import { log, queryDOMMap, setMinusxMode, toggleMinusXRoot, queryURL, forwardToTab} from './rpc';
import _, { get, isEqual, pick, set } from 'lodash';
import { configs } from '../constants';
import { setAxiosJwt } from './api';
import { ToastContainer } from './toast';
import { interruptPlan, setActiveThreadStatus } from '../state/chat/reducer';
import { initEventCapture } from '../tracking/init';
import { getExtensionID } from '../helpers/extensionId';
import { onSubscription } from '../helpers/documentSubscription';
import { getApp } from '../helpers/app';
import { getParsedIframeInfo } from '../helpers/origin';
import { identifyUser } from '../tracking';
const toggleMinusX = (value?: boolean) => toggleMinusXRoot('closed', value)

if (configs.IS_DEV) {
    console.log = log
    ;(window as any).forwardToTab = forwardToTab
} else {
    console.log = () => {}
    console.error = () => {}
}

const initRPCSync = (ref: React.RefObject<HTMLInputElement>) => {
    window.addEventListener('message', (event) => {
        const rpcEvent = event.data
        if (!rpcEvent.id && rpcEvent.type == 'STATE_SYNC') {
            console.log('RPC sync is', rpcEvent.payload)
            if (rpcEvent.payload.key == 'class-closed') {
                if (rpcEvent.payload.value == false) {
                    ref.current?.focus()
                    dispatch(updateIsAppOpen(true))
                } else {
                    dispatch(updateIsAppOpen(false))
                }
            }
            if (rpcEvent.payload.key == 'subscription') {
                const payload = rpcEvent.payload.value
                // @ppsreejith: Backward compatible hack.
                if (!get(payload, 'url')) {
                    onSubscription({
                        id: payload.id,
                        elements: get(payload, 'elements.elements'),
                        url: get(payload, 'elements.url')
                    })
                } else {
                    onSubscription(payload)
                }
            }
        }
    })
}

const initCrossInstanceComms = (ref: React.RefObject<HTMLInputElement>) => {
    window.addEventListener('message', (event) => {
        const rpcEvent = event.data
        if (rpcEvent && rpcEvent.type == 'CROSS_TAB_REQUEST') {
            const { uuid, message } = rpcEvent
            const response = "Hi from " + window.location.href + " " + message
            window.parent.postMessage({
                type: 'RESPONSE',
                uuid,
                payload: response
            }, "*")
        }
    })
}

const useMinusXMode = () => {
    // const appMode = useSelector((state: RootState) => state.settings.appMode)
    // if (appMode == 'selection') {
    //     return 'open-selection'
    // }
    const devTools = useSelector((state: RootState) => state.settings.isDevToolsOpen)
    if (devTools) {
        return 'open-sidepanel-devtools'
    }
    return 'open-sidepanel'
}

const init = _.once((mode: string, ref: React.RefObject<HTMLInputElement>, isAppOpen: boolean) => {
    dispatch(setIframeInfo(getParsedIframeInfo()))
    getApp().setup()
    initRPCSync(ref)
    setMinusxMode(mode)
    toggleMinusX(!isAppOpen)
    toggleMinusXRoot('invisible', false)
    initEventCapture();
    initCrossInstanceComms(ref)
})

const persistor = persistStore(store);
const useAppStore = getApp().useStore()

function ProviderApp() {
    const mode = useMinusXMode()
    const profileId = useSelector((state: RootState) => state.auth.profile_id)
    const email = useSelector((state: RootState) => state.auth.email)
    const session_jwt = useSelector((state: RootState) => state.auth.session_jwt)
    const isAppOpen = useSelector((state: RootState) => state.settings.isAppOpen)
    const toolEnabled = useAppStore((state) => state.isEnabled)
   
    const ref = useRef<HTMLInputElement>(null)
    const activeThread = useSelector((state: RootState) => state.chat.threads[state.chat.activeThread])
    useEffect(() => {
        init(mode, ref, isAppOpen)
        if (session_jwt) {
            setAxiosJwt(session_jwt)
        }
    }, [profileId, session_jwt])
    useEffect(() => {
        const extensionId = getExtensionID()
        const globalData = {
            ...getParsedIframeInfo()
        }
        if (profileId) {
            const kv = {
                email: email || '',
                ...globalData
            }
            identifyUser(profileId, kv)
        } else {
            identifyUser(extensionId, globalData)
        }
    }, [profileId])
    // Hack to fix planning stage
    useEffect(() => {
        if (activeThread.status == 'EXECUTING') {
            dispatch(interruptPlan({
                planID: activeThread.messages.length - 1,
                actionStatus: 'INTERRUPTED'
            }))
            dispatch(setActiveThreadStatus('FINISHED'))
        } else if (activeThread.status == 'PLANNING') {
            dispatch(setActiveThreadStatus('FINISHED'))
        }
    }, [])
    return (
        <>
            {!toolEnabled.value && <DisabledOverlayComponent toolEnabledReason={toolEnabled.reason} />}
            <App ref={ref} />
        </>
    )
}

function DisabledOverlayComponent({ toolEnabledReason }: { toolEnabledReason: string }) {
    const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)
    return <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: isDevToolsOpen ? '850px' : '350px', // Hack to fix Disabled Overlay
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

function RootApp() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
            <ChakraContext>
                {/* <DebugComponent /> */}
                <ProviderApp />
            </ChakraContext>
            </PersistGate>
        </Provider>
    ) 
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <RootApp />
    <ToastContainer/>
    {/* <TestingApp /> */}
  </React.StrictMode>,
);