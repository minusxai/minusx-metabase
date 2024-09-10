import { configs } from "../../constants"
import posthog from 'posthog-js'
import * as RPC from '../../app/rpc'

type PosthogConfigs = Parameters<typeof posthog.init>[1]
let _posthog_enabled = true

export async function initPosthog() {
    const parsedPosthogConfigs = JSON.parse(configs.POSTHOG_CONFIGS)
    const posthogConfig: PosthogConfigs = {
        ...parsedPosthogConfigs,
        loaded: takeFullSnapshot
    }
    posthog.init(
        configs.POSTHOG_API_KEY,
        posthogConfig
    )

    setTimeout(takeFullSnapshot, 3000)
    setInterval(takeFullSnapshot, 60000)
}

export const identifyPosthogUser = async (profile_id: string, kv?: Record<string, string>) => {
    try {
        await RPC.identifyPosthogUser(profile_id, kv)
        posthog.identify(profile_id, kv)
    } catch (err) {
        console.error('Error while identifying posthog user is', err)
    }
    const data = {
        profile_id,
        ...kv
    }
    await setPosthogGlobalProperties(data)
}

export const setPosthogGlobalProperties = async (kv: Record<string, string>) => {
    try {
        await RPC.setPosthogGlobalProperties(kv)
    } catch (err) {
        console.error('Error while registering global posthog events (RPC) is', err)
    }
    try {
        posthog.register(kv)
    } catch (err) {
        console.error('Error while registering global posthog events is', err)
    }
}

export const setPosthogPersonProperties = async (kv: Record<string, string>) => {
    try {
        await RPC.setPosthogPersonProperties(kv)
    } catch (err) {
        console.error('Error while registering posthog person properties (RPC) is', err)
    }
    try {
        posthog.setPersonProperties(kv)
    } catch (err) {
        console.error('Error while registering posthog person properties is', err)
    }
}

export const capturePosthogEvent = async (event: string, kv?: object) => {
    if (!_posthog_enabled) {
        return
    }
    try {
        await RPC.capturePosthogEvent(event, kv)
        posthog.capture(event, kv)
    } catch (err) {
        console.error('Error while capturing posthog event', err)
    }
}

export const resetPosthog = async () => {
    try {
        await RPC.resetPosthog()
        posthog.reset()
    } catch (err) {
        console.error('Error while Resetting posthog', err)
    }
}

export const stopPosthog = async () => {
    try {
        posthog.opt_out_capturing()
    } catch (err) {
        console.error('Error while stopping posthog!', err)
    }
    try {
        await RPC.stopPosthog()
    } catch (err) {
        console.error('Error while stopping posthog RPC!', err)
    }
    _posthog_enabled = false
}

export const startPosthog = async () => {
    try {
        posthog.opt_in_capturing()
    } catch (err) {
        console.error('Error while startin posthog!', err)
    }
    try {
        await RPC.startPosthog()
    } catch (err) {
        console.error('Error while startin posthog RPC!', err)
    }
    _posthog_enabled = true
}

const takeFullSnapshot = async () => {
    try {
        await RPC.takeFullPosthogSnapshot()
    } catch (err) {
        console.error('Error while taking full RPC posthog snapshot!', err)
    }
    try {
        window.rrweb.record.takeFullSnapshot()
    } catch (err) {
        console.error('Error while taking full rrweb snapshot!', err)
    }
}