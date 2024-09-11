import { ToolMatcher } from 'extension/types'

// runs in content script context
export abstract class AppSetup {
    abstract fingerprintMatcher: ToolMatcher;

    // 1. Handles setup
    async setup(extensionConfigs: Promise<object>) {};
}