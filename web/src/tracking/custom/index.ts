import axios from 'axios';
import { once } from "lodash"
import { saveEvent, sendBatch } from "../../cache/events"
import { configs } from '../../constants';
const url = `${configs.LOGGING_BASE_URL}/events`

let _event_capture_enabled = true
let _globalProperties = {}

export const setGlobalCustomEventProperties = (properties: object) => {
    _globalProperties = {
        ...properties
    }
}

export const captureCustomEvent = async (type: string, payload?: object) => {
    if (!_event_capture_enabled) {
        return false
    }
    await saveEvent({ type, payload })
}

export const initCustomEventCapture = once(() => {
    const schedule = () => sendBatch(async (events) => {
        const send = async () => {
            if (events.length === 0) {
                return true
            }
            const filledEvents = events.map(event => ({
                ...event,
                global: {
                    ..._globalProperties
                }
            }))
            const response = await axios.post(url, filledEvents, {
                headers: {
                  'Content-Type': 'application/json',
                },
            })
            return response.data.success
        }
        let success = true
        for (let i=0; i<3; i++) {
            try {
                success = await send()
            } catch (e) {
                console.error('Failed to send events', e)
            }
            if (success) {
                break
            }
        }
        setTimeout(schedule, 10000)
        return success
    })
    schedule()
    startCustomEventCapture()
})

export const stopCustomEventCapture = () => {
    _event_capture_enabled = false
}

export const startCustomEventCapture = () => {
    _event_capture_enabled = true
}