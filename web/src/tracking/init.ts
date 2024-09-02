import { once } from "lodash"
import { AppDispatch, eventListener, getState, RootState } from "../state/store"
import { initPosthog, resetPosthog } from "./posthog"
import { initCustomEventCapture } from "./custom"
import { captureEvent, startEventCapture, stopEventCapture } from "./"
import { configs } from "../constants"

const payloadLessEvents = ['persist/REHYDRATE']

export const initEventCapture = once(() => {
    eventListener.startListening.withTypes<RootState, AppDispatch>()({
        predicate: () => true,
        effect: async (action) => {
            const { type, payload } = action 
            // Special case to disable
            if (!payload || payloadLessEvents.includes(type)) {
                captureEvent(type)
            } else if (typeof payload === 'object') {
                captureEvent(type, payload)
            } else {
                captureEvent(type, { payload })
            }
            if (type == 'settings/setUploadLogs') {
                if (payload === false) {
                    stopEventCapture()
                } else {
                    startEventCapture()
                }
            }
            if(type == 'logout') {
                resetPosthog()
                // #HACK since default is telemetry on.
                startEventCapture()
            }
        },
    }) 
    initCustomEventCapture()
    if (!configs.IS_DEV) {
        initPosthog()
    }
    if (getState().settings.uploadLogs) {
        startEventCapture()
    } else {
        stopEventCapture()
    }
})