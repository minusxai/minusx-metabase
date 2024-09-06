import defaults from './env.defaults.json'

interface ENV {
    BASE_SERVER_URL: string
    SERVER_PATH: string
    WEB_URL: string
    WEB_CSS_CONFIG_PATH: string
    WEB_JSON_CONFIG_PATH: string
    IS_DEV: boolean
    POSTHOG_API_KEY: string
    POSTHOG_CONFIGS: string
    GIT_COMMIT_ID: string
    NPM_PACKAGE_VERSION: string
}

const env: ENV = {
    BASE_SERVER_URL: process.env.BASE_SERVER_URL|| defaults.BASE_SERVER_URL,
    SERVER_PATH: process.env.SERVER_PATH || defaults.SERVER_PATH,
    WEB_URL: process.env.WEB_URL || defaults.WEB_URL,
    WEB_CSS_CONFIG_PATH: process.env.WEB_CSS_CONFIG_PATH || defaults.WEB_CSS_CONFIG_PATH,
    WEB_JSON_CONFIG_PATH: process.env.WEB_JSON_CONFIG_PATH || defaults.WEB_JSON_CONFIG_PATH,
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY || defaults.POSTHOG_API_KEY,
    POSTHOG_CONFIGS: process.env.POSTHOG_CONFIGS || defaults.POSTHOG_CONFIGS,
    GIT_COMMIT_ID: process.env.GIT_COMMIT_ID || '',
    NPM_PACKAGE_VERSION: process.env.npm_package_version || '',
    IS_DEV: process.env.NODE_ENV == 'development'
}

interface Configs extends ENV {
    SERVER_URL: string
    WEB_CSS_CONFIG_URL: string
    WEB_JSON_CONFIG_URL: string
}

const SERVER_URL = env.BASE_SERVER_URL + env.SERVER_PATH
const WEB_CSS_CONFIG_URL = env.WEB_URL + env.WEB_CSS_CONFIG_PATH
const WEB_JSON_CONFIG_URL = env.WEB_URL + env.WEB_JSON_CONFIG_PATH

export const configs: Configs = {
    ...env,
    SERVER_URL,
    WEB_CSS_CONFIG_URL,
    WEB_JSON_CONFIG_URL
}

// #HACK Temporary placeholder until we have the tools repo
export const TOOLS = {
    OTHER: "other",
    JUPYTER: "jupyter",
    POSTHOG: "posthog",
    METABASE: "metabase",
}