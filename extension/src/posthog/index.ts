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
    identifyPosthogUser: async (unique_id: string, kv?: Record<string, string>) => {
        const data = {
            ...kv,
        }
        window.posthog.identify(unique_id, data)
    },
    setPosthogGlobalProperties: async (kv: Record<string, any>) => {
        window.posthog.register(kv)
    },
    setPosthogPersonProperties: async (kv: Record<string, any>) => {
        window.posthog.setPersonProperties(kv)
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

export const initPosthog = () => {
    const posthog = window.posthog
    const parsedPosthogConfigs = JSON.parse(configs.POSTHOG_CONFIGS)
    posthog.init(
        configs.POSTHOG_API_KEY,
        parsedPosthogConfigs
    )
}