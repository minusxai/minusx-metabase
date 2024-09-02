import { configs } from '../constants'
import  './array.full.js'
// import posthog from 'posthog-js'
// import { initWindowListener } from '../content/RPCs/initListeners'
// import { PostHog, PostHogConfig } from 'posthog-js'

export const posthogRPCs = {
    startPosthog: async () => {
        window.posthog.opt_in_capturing()
    },
    takeFullPosthogSnapshot: async () => {
        window.rrweb.record.takeFullSnapshot()
    },
    identifyPosthogUser: async (profile_id: string, kv?: Record<string, string>) => {
        const data = {
            ...kv,
            profile_id
        }
        window.posthog.identify(profile_id, data)
    },
    setPosthogGlobalProperties: async (kv: Record<string, any>) => {
        window.posthog.register(kv)
    },
    capturePosthogEvent: async (event: string, kv?: object) => {
        const data = {
            ...kv,
            event
        }
        window.posthog.capture(event, data)
    },
    resetPosthog: async () => {
        window.posthog.reset()
    },
    stopPosthog: async () => {
        window.posthog.opt_out_capturing()
    }
}

export const initPosthog = (posthog_api_key: string, posthog_config?: Partial<PostHogConfig>) => {
    const posthog = window.posthog
    const parsedPosthogConfigs = JSON.parse(configs.POSTHOG_CONFIGS)
    posthog_config = {
        ...parsedPosthogConfigs,
        ...posthog_config
    }
    posthog.init(
        posthog_api_key,
        posthog_config
    )
}