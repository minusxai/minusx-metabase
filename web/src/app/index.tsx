import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import ChakraContext from '../components/common/ChakraContext';
import App from '../components/common/App';
import { persistStore } from 'redux-persist';
import { RootState, store } from '../state/store';
import { setAppRecording, setIframeInfo, updateIsAppOpen } from '../state/settings/reducer';
import { dispatch } from '../state/dispatch';
import { log, queryDOMMap, setMinusxMode, toggleMinusXRoot, queryURL, forwardToTab, gdocRead, gdocWrite, gdocImage, gdocReadSelected, captureVisibleTab, getPendingMessage, gsheetSetUserToken} from './rpc';
import _, { get, isEqual, pick, set } from 'lodash';
import { configs } from '../constants';
import { setAxiosJwt } from './api';
import { ToastContainer } from './toast';
import { interruptPlan, setActiveThreadStatus } from '../state/chat/reducer';
import { initEventCapture, initEventListener } from '../tracking/init';
import { getExtensionID } from '../helpers/extensionId';
import { onSubscription } from '../helpers/documentSubscription';
import { getApp } from '../helpers/app';
import { getParsedIframeInfo, IframeInfoWeb } from '../helpers/origin';
import { captureEvent, GLOBAL_EVENTS, identifyUser, setGlobalProperties } from '../tracking';
import { useAppFromExternal } from './rpc';
import { Button } from '@chakra-ui/react';
import { convertToMarkdown } from '../helpers/LLM/remote';
import { setInstructions } from '../state/thumbnails/reducer';
import { IntercomProvider, useIntercom } from 'react-use-intercom';
import { endTranscript, storeTranscripts } from '../helpers/recordings';
import { onNativeEvent } from '../helpers/nativeEvents';

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
            if (rpcEvent.payload.key == 'nativeEvent') {
                const payload = rpcEvent.payload.value
                // @ppsreejith: Backward compatible hack.
                onNativeEvent(payload)
            }
            if (rpcEvent.payload.key == 'recordingInProgress') {
                const isRecording = rpcEvent.payload.value
                dispatch(setAppRecording(isRecording))
                if (!isRecording) {
                    endTranscript()
                }
            }
            if (rpcEvent.payload.key == 'recordingTranscript') {
                const transcript = rpcEvent.payload.value
                storeTranscripts(transcript)
            }
        } else if (rpcEvent && rpcEvent.type == 'CROSS_TAB_REQUEST') {
            const { uuid, message } = rpcEvent
            useAppFromExternal({text: message}).then(response => {
                let rootParent = window.parent
                while (rootParent != rootParent.parent) {
                    rootParent = rootParent.parent
                }
                rootParent.postMessage({
                    type: 'RESPONSE',
                    uuid,
                    payload: response
                }, "*")
            })
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

initEventCapture()

const checkDiagnostics = async () => {
    const tool = getParsedIframeInfo().tool
    const app = getApp()
    const diagnostics = await app.getDiagnostics()
    const payload = {
        ...diagnostics,
        tool,
    }
    captureEvent(GLOBAL_EVENTS.diagnostics, payload)
}

const init = _.once((mode: string, ref: React.RefObject<HTMLInputElement>, isAppOpen: boolean) => {
    initEventListener();
    dispatch(setIframeInfo(getParsedIframeInfo()))
    getApp().setup()
    initRPCSync(ref)
    setMinusxMode(mode)
    toggleMinusX(!isAppOpen)
    toggleMinusXRoot('invisible', false)
    checkDiagnostics()
})

const useInitArgs = (cb: Function, args: any[]) => {
    const prevArgsRef = useRef(args)
    const isFirstRender = useRef(true);

    const hasChanged = args.some((arg, index) => prevArgsRef.current[index] !== arg)

    if (isFirstRender.current || hasChanged) {
        isFirstRender.current = false
        prevArgsRef.current = args
        cb()
    }
}

const persistor = persistStore(store);

interface GlobalData extends IframeInfoWeb {
    IS_DEV: string
    email?: string
    profile_id?: string
}

function ProviderApp() {
    const mode = useMinusXMode()
    const tool = getParsedIframeInfo().tool
    const toolVersion = getParsedIframeInfo().toolVersion
    const extId = getParsedIframeInfo().r
    const isGSheets = tool == 'google' && toolVersion == 'sheets'
    const profileId = useSelector((state: RootState) => state.auth.profile_id)
    const email = useSelector((state: RootState) => state.auth.email)
    const session_jwt = useSelector((state: RootState) => state.auth.session_jwt)
    const isAppOpen = useSelector((state: RootState) => state.settings.isAppOpen)
   
    const ref = useRef<HTMLInputElement>(null)
    const activeThread = useSelector((state: RootState) => state.chat.threads[state.chat.activeThread])
    init(mode, ref, isAppOpen)
    useInitArgs(() => {
        if (session_jwt) {
            setAxiosJwt(session_jwt) 
        }
        if (isGSheets) {
            if (session_jwt) {
                gsheetSetUserToken(session_jwt)
            } else {
                gsheetSetUserToken('')
            }
        }
    }, [session_jwt])
    useInitArgs(() => {
        const globalData: GlobalData = {
            IS_DEV: String(configs.IS_DEV),
            ...getParsedIframeInfo(),
            email,
            profile_id: profileId
        }
        setGlobalProperties({...globalData})
        if (profileId) {
            const personProperties = {
                email,
                profile_id: profileId,
                [`tool_${tool}`]: true,
                [`toolVersion_${toolVersion}`]: true,
                r: extId,
            }
            identifyUser(profileId, personProperties)
        }
    }, [profileId])
    // Hack to fix planning stage
    useInitArgs(() => {
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
            <App ref={ref} />
        </>
    )
}


const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAApgAAAKYB3X3/OAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANCSURBVEiJtZZPbBtFFMZ/M7ubXdtdb1xSFyeilBapySVU8h8OoFaooFSqiihIVIpQBKci6KEg9Q6H9kovIHoCIVQJJCKE1ENFjnAgcaSGC6rEnxBwA04Tx43t2FnvDAfjkNibxgHxnWb2e/u992bee7tCa00YFsffekFY+nUzFtjW0LrvjRXrCDIAaPLlW0nHL0SsZtVoaF98mLrx3pdhOqLtYPHChahZcYYO7KvPFxvRl5XPp1sN3adWiD1ZAqD6XYK1b/dvE5IWryTt2udLFedwc1+9kLp+vbbpoDh+6TklxBeAi9TL0taeWpdmZzQDry0AcO+jQ12RyohqqoYoo8RDwJrU+qXkjWtfi8Xxt58BdQuwQs9qC/afLwCw8tnQbqYAPsgxE1S6F3EAIXux2oQFKm0ihMsOF71dHYx+f3NND68ghCu1YIoePPQN1pGRABkJ6Bus96CutRZMydTl+TvuiRW1m3n0eDl0vRPcEysqdXn+jsQPsrHMquGeXEaY4Yk4wxWcY5V/9scqOMOVUFthatyTy8QyqwZ+kDURKoMWxNKr2EeqVKcTNOajqKoBgOE28U4tdQl5p5bwCw7BWquaZSzAPlwjlithJtp3pTImSqQRrb2Z8PHGigD4RZuNX6JYj6wj7O4TFLbCO/Mn/m8R+h6rYSUb3ekokRY6f/YukArN979jcW+V/S8g0eT/N3VN3kTqWbQ428m9/8k0P/1aIhF36PccEl6EhOcAUCrXKZXXWS3XKd2vc/TRBG9O5ELC17MmWubD2nKhUKZa26Ba2+D3P+4/MNCFwg59oWVeYhkzgN/JDR8deKBoD7Y+ljEjGZ0sosXVTvbc6RHirr2reNy1OXd6pJsQ+gqjk8VWFYmHrwBzW/n+uMPFiRwHB2I7ih8ciHFxIkd/3Omk5tCDV1t+2nNu5sxxpDFNx+huNhVT3/zMDz8usXC3ddaHBj1GHj/As08fwTS7Kt1HBTmyN29vdwAw+/wbwLVOJ3uAD1wi/dUH7Qei66PfyuRj4Ik9is+hglfbkbfR3cnZm7chlUWLdwmprtCohX4HUtlOcQjLYCu+fzGJH2QRKvP3UNz8bWk1qMxjGTOMThZ3kvgLI5AzFfo379UAAAAASUVORK5CYII="

function DebugComponent() {
    const [docContent, setDocContent] = useState('Doc content')
    const readSelected = async () => {
        // if (window.parent.parent.parent.parent.parent) {
        //     let child = window
        //     let parent = child.parent;
        //     let index = 0
        //     while (parent != child) {
        //         child = parent
        //         parent = parent.parent
        //         index += 1
        //         if (index > 10) {
        //             break
        //         }
        //     }
        //     if(index < 10) {
        //         // alert('yes ' + index)
        //     } else {
        //         // alert('no')
        //     }
        // }
        // const url = await captureVisibleTab()
        // console.log('URL is', url)
        // return;
        const docContent = await gdocReadSelected()
        setDocContent(JSON.stringify(docContent))
    }
    const readDoc = async () => {
        const docContent = await gdocRead()
        setDocContent(JSON.stringify(docContent))
    }
    const markdown = `# Heading
Hello World

## Subheading
Hello subheading

Image:
![Hello World](${base64Image})

# Heading
Hello World

## Subheading
Hello subheading

Image:
![Hello World](${base64Image})

# Heading
Hello World

## Subheading
Hello subheading

Image:
![Hello World](${base64Image})

# Heading
Hello World

## Subheading
Hello subheading

Image:
![Hello World](${base64Image})
`
    const writeDoc = async () => {
        const result = await gdocWrite(markdown, '')
    }

    const imageDoc = async () => {
        const result = await gdocImage(base64Image, 4)
    }
    const width = getParsedIframeInfo().width
    return <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: `${width}px`, position: 'absolute', right: 0}}>
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
            <Button onClick={readSelected} style={{flex: 1}}>Read Selected</Button>
            <Button onClick={readDoc} style={{flex: 1}}>Read Doc</Button>
        </div>
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
            <Button onClick={writeDoc} style={{flex: 1}}>Write Doc</Button>
            <Button onClick={imageDoc} style={{flex: 1}}>Image Doc</Button>
        </div>
        <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
            {docContent}
        </div>
    </div>
}

const INTERCOM_APP_ID = 'iiqgdpva'

function RootApp() {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <IntercomProvider appId={INTERCOM_APP_ID}>
                    <ChakraContext>
                        {/* <DebugComponent /> */}
                        <ProviderApp />
                    </ChakraContext>
                </IntercomProvider>
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