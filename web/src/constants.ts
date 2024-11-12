import defaults from './env.defaults.json'

interface ENV {
    BASE_SERVER_URL: string
    SERVER_PATH: string
    AUTH_PATH: string
    PLANNER_PATH: string
    LOGGING_PATH: string
    WEB_URL: string
    POSTHOG_API_KEY: string
    POSTHOG_CONFIGS: string
    GIT_COMMIT_ID: string
    NPM_PACKAGE_VERSION: string
    IS_DEV: boolean
}

const IS_DEV = process.env.IS_PROD == 'true' ? false : process.env.NODE_ENV == 'development'

const conf: ENV = {
    BASE_SERVER_URL: process.env.BASE_SERVER_URL || defaults.BASE_SERVER_URL,
    SERVER_PATH: process.env.SERVER_PATH || defaults.SERVER_PATH,
    AUTH_PATH: process.env.AUTH_PATH || defaults.AUTH_PATH,
    PLANNER_PATH: process.env.PLANNER_PATH || defaults.PLANNER_PATH,
    LOGGING_PATH: process.env.LOGGING_PATH || defaults.LOGGING_PATH,
    WEB_URL: process.env.WEB_URL || defaults.WEB_URL,
    POSTHOG_API_KEY: process.env.POSTHOG_API_KEY || defaults.POSTHOG_API_KEY,
    POSTHOG_CONFIGS: process.env.POSTHOG_CONFIGS || defaults.POSTHOG_CONFIGS,
    GIT_COMMIT_ID: process.env.GIT_COMMIT_ID || '',
    NPM_PACKAGE_VERSION: process.env.npm_package_version || '',
    IS_DEV: IS_DEV,
}

interface Configs extends ENV {
    SERVER_BASE_URL: string
    AUTH_BASE_URL: string
    PLANNER_BASE_URL: string
    LOGGING_BASE_URL: string
    VOICE_ENABLED: boolean
}

const SERVER_BASE_URL = conf.BASE_SERVER_URL + conf.SERVER_PATH

export const configs: Configs = {
    ...conf,
    SERVER_BASE_URL,
    AUTH_BASE_URL: SERVER_BASE_URL + conf.AUTH_PATH,
    PLANNER_BASE_URL: SERVER_BASE_URL + conf.PLANNER_PATH,
    LOGGING_BASE_URL: SERVER_BASE_URL + conf.LOGGING_PATH,
    VOICE_ENABLED: false || IS_DEV,
}