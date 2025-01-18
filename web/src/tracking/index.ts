import { capturePosthogEvent, identifyPosthogUser, setPosthogGlobalProperties, setPosthogPersonProperties, startPosthog, stopPosthog } from "./posthog"
import { captureCustomEvent, setGlobalCustomEventProperties, startCustomEventCapture, stopCustomEventCapture } from "./custom"

export const GLOBAL_EVENTS = {
    "email_entered": "global/email_entered",
    "otp_received": "global/otp_received",
    "otp_sending_failed": "global/otp_sending_failed",
    "email_reset": "global/email_reset",
    "otp_attempted": "global/otp_attempted",
    "otp_failed": "global/otp_failed",
    "otp_success": "global/otp_success",
    "user_signup": "global/user_signup",
    "user_discovery_source": "global/user_discovery_source",
    "user_login": "global/user_login",
    "user_token_refresh": "global/token_refresh",
    "billing_checkout": "global/billing_checkout",
    "billing_portal": "global/billing_portal",
    "billing_subscribed": "global/billing_subscribed",
    "billing_unsubscribed": "global/billing_unsubscribed",
    "diagnostics": "global/diagnostics",
}

export const captureEvent = (type: string, payload?: object) => {
    const clientTimestamp = Date.now()
    const eventPayload = {
        ...payload,
        clientTimestamp
    }
    capturePosthogEvent(type, eventPayload)
    // captureCustomEvent(type, payload)
}

export const identifyUser = (unique_id: string, kv?: Record<string, string>) => {
    identifyPosthogUser(unique_id, kv)
    setPosthogPersonProperties({...kv})
}

export const setGlobalProperties = (kv: Record<string, string>) => {
    setGlobalCustomEventProperties(kv)
    setPosthogGlobalProperties(kv)
}

export const stopEventCapture = () => {
    stopPosthog()
    stopCustomEventCapture()
}

export const startEventCapture = () => {
    startPosthog()
    startCustomEventCapture()
}