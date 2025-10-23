import { Action, combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import chat, { initialUserConfirmationState, initialClarificationState, initialTasks, getID } from './chat/reducer'
import auth from './auth/reducer'
import thumbnails from './thumbnails/reducer'
import settings, { DEFAULT_TABLES, DEFAULT_MINUSXMD } from './settings/reducer'
import { ContextCatalog } from '../helpers/utils'
import storage from 'redux-persist/lib/storage'
import { persistReducer, createMigrate } from 'redux-persist'
import logger from 'redux-logger'
import { configs } from '../constants'
import { plannerListener } from '../planner/planner'
import billing from './billing/reducer'
import semanticLayer from './semantic-layer/reducer'
import cache from './cache/reducer'
import notifications from './notifications/reducer'
import configsReducer from './configs/reducer'
import { userStateApi } from '../app/api/userStateApi'
import { atlasApi } from '../app/api/atlasApi'
import { get } from 'lodash'
import { getParsedIframeInfo } from '../helpers/origin'

const combineReducerInput = {
  chat,
  auth,
  settings,
  thumbnails,
  billing,
  semanticLayer,
  cache,
  notifications,
  configs: configsReducer,
  [userStateApi.reducerPath]: userStateApi.reducer,
  [atlasApi.reducerPath]: atlasApi.reducer
}

const combinedReducer = combineReducers(combineReducerInput);

const rootReducer = (state: any, action: any) => {
  let updatedState = state;

  switch (action.type) {
    case 'reset':
      updatedState = {
        auth: state.auth,
        configs: state.configs
      };
      break;
    
    case 'logout':
      updatedState = {};
      break;
    case 'upload_thread':
      const newThread = {
        ...action.payload,
        index: state.chat.threads.length,
      }
      updatedState = {
        ...state,
        chat: {
          ...state.chat,
          threads: [...state.chat.threads, newThread],
          activeThread: state.chat.threads.length
        }
      };
      break;
    
      case 'upload_state':
        updatedState = {
          ...action.payload
        }
        break;
  }

  return combinedReducer(updatedState, action);
}

export type RootState = ReturnType<typeof rootReducer>

const migrations = {
  0: (state: any) => {
    let newState = {...state}
    newState = {
      ...newState,
      executor: {
        status: 'FINISHED'
      }
    }
    if (newState.plan) {
      delete newState.plan
    }
    return newState;
  },
  // add the finishReason to the assistant messages
  1: (state: any) => {
    let newState = {...state} 
    newState.chat.threads.forEach((thread: any) => {
      thread.messages.forEach((message: any) => {
        if (message.role == 'assistant') {
          message.content.finishReason = message.content.finishReason || 'stop'
        }
      })
    })
    return newState;
  },
  2: (state: any) => {
    let newState = {...state}
    // #Hack, not sure if this is needed
    // newState.toolConfig = toolConfigInitialState
    return newState;
  },
  3: (state: any) => {
    let newState = {...state}
    newState.cache = {}
    return newState;
  },
  // resetting the cache...
  4: (state: any) => {
    let newState = {...state}
    newState.cache = {}
    return newState;
  },
  // removing cache altogether...
  5: (state: any) => {
    let newState = {...state}
    delete newState.cache
    return newState;
  },
  // removing toolConfig.isToolEnabled and toolConfig.toolEnabledReason
  6: (state: any) => {
    let newState = {...state}
    if (newState.toolConfig) {
      delete newState.toolConfig.isToolEnabled
      delete newState.toolConfig.toolEnabledReason
    }
    return newState;
  },
  7: (state: any) => {
    let newState = {...state}
    newState.chat.threads.forEach((thread: any) => {
      thread.userConfirmation = initialUserConfirmationState
    })
    return newState;
  },
  8: (state: any) => {
    let newState = {...state}
    newState.settings.confirmChanges = false
    return newState;
  },
  9: (state: any) => {
    let newState = {...state}
    if (state.auth.is_authenticated) {
      newState.auth.membership = 'free'
      newState.auth.credits_expired = false
    }
    return newState;
  },
  // remove membership and credits_expired from auth; add billing
  10: (state: any) => {
    let newState = {...state}
    if (state.auth.is_authenticated) {
      delete newState.auth.membership
      delete newState.auth.credits_expired
    }
    newState.billing = {
      isSubscribed: false,
      credits: 0
    }
    return newState;
  },
  11: (state: any) => {
    let newState = {...state}
    newState.settings.intercomBooted = false
    return newState;
  },
  // add aiRules
  12: (state: any) => {
    let newState = {...state}
    newState.settings.aiRules = ''
    return newState;
  },
  13: (state: any) => {
    let newState = {...state}
    newState.settings.savedQueries = false
    return newState;
  },
  14: (state: any) => {
    let newState = {...state}
    newState.settings.newSearch = true
    return newState;
  },
  15: (state: any) => {
    let newState = {...state}
    if (!newState.semanticLayer) {
      newState.semanticLayer = {
        availableMeasures: [],
        availableDimensions: []
      }
    }
    if (!newState.thumbnails.semanticQuery) {
      newState.thumbnails.semanticQuery = {
        measures: [],
        dimensions: [],
        filters: [],
        timeDimensions: [],
        order: []
      }
    }
    return newState
  },
  16: (state: any) => {
    let newState = {...state}
    if (!newState.semanticLayer.availableLayers) {
      newState.semanticLayer.availableLayers = []
    }
    if (!newState.thumbnails.semanticLater) {
      newState.thumbnails.semanticLayer = null
    }
    return newState
  },
  17: (state: any) => {
    let newState = {...state}
    if (!newState.settings.tableDiff) {
      newState.settings.tableDiff = []
    }
    return newState
  },
  18: (state: any) => {
    let newState = {...state}
    newState.settings.tableDiff = {
      add: [],
      remove: []
    }
    return newState
  },
  19: (state: any) => {
    let newState = {...state}
    if (Array.isArray(newState.settings.tableDiff)) {
      newState.settings.tableDiff = {
        add: [],
        remove: []
      }
    }
    return newState
  },
  20: (state: any) => {
      let newState = {...state}
      newState.settings.selectedCatalog = 'tables'
      newState.settings.availableCatalogs = [{
          name: DEFAULT_TABLES,
          value: 'tables'
      }]
      return newState
  },
  21: (state: any) => {
      let newState = {...state}
      newState.settings.selectedCatalog = ''
      newState.settings.availableCatalogs = []
      newState.settings.defaultTableCatalog = {
          name: DEFAULT_TABLES,
          value: 'tables',
          content: {},
          dbName: ''
      }
      return newState
  },
  22: (state: any) => {
      let newState = {...state}
      newState.chat.threads.forEach((thread: any) => {
          thread.tasks = initialTasks
      })
      return newState
  },
  23: (state: RootState) => {
    // Legacy migration - deprecated catalog/groups functionality removed
    return {...state}
  },
  24: (state: RootState) => {
    // Legacy migration - deprecated catalog functionality removed
    return {...state}
  },
  25: (state: RootState) => {
    // Legacy migration - deprecated catalog functionality removed
    return {...state}
  },
  26: (state: any) => {
    let newState = {...state}
    newState.settings.snippetsMode = false
    return newState
  },
  27: (state: RootState) => {
    let newState = {...state}
    const uniqueIDPrefix = `v0-${getID()}`
    newState.chat.threads.forEach((thread) => {
      if (!thread.id) {
        thread.id = `${uniqueIDPrefix}-${thread.index}`
      }
    })
    return newState
  },
  28: (state: RootState) => {
    let newState = {...state}
    if (!newState.cache) {
      newState.cache = {
        mxCollectionId: null,
        mxModels: []
      }
    }
    // remove mxModels and mxCollectionId from settings (in case they exist)
    if (newState.settings?.mxModels) {
      delete newState.settings.mxModels
    } 
    if (newState.settings?.mxCollectionId) {
      delete newState.settings.mxCollectionId
    }
    return newState
  },
  29: (state: RootState) => {
    let newState = {...state}
    // check if snippetsMode exists
    if (newState.settings?.snippetsMode != undefined) {
      newState.settings.modelsMode = newState.settings.snippetsMode
      delete newState.settings.snippetsMode
    } else if (newState.settings.modelsMode == undefined) {
      newState.settings.modelsMode = false
    }
    return newState
  },
  30: (state: RootState) => {
    // Legacy migration - deprecated catalog/groups functionality removed
    return {...state}
  },
  31: (state: RootState) => {
    let newState = {...state}
    newState.settings.modelsMode = true
    return newState
  },
  32: (state: RootState) => {
    // Legacy migration - deprecated catalog functionality removed
    return {...state}
  },
  33: (state: RootState) => {
    let newState = {...state}
    newState.notifications = {
      notifications: [],
      lastFetchTime: null,
    }
    return newState
  },
  34: (state: RootState) => {
    let newState = {...state}
    newState.settings.selectedModels = []
    return newState
  },
  35: (state: RootState) => {
    // if there's any selectedModels that don't have a dbId, just remove them
    let newState = {...state}
    newState.settings.selectedModels = newState.settings.selectedModels.filter((model) => model.dbId !== undefined)
    return newState
  },
  36: (state: RootState) => {
    let newState = {...state}
    newState.settings.aiRules = DEFAULT_MINUSXMD
    newState.settings.useMemory = true
    return newState
  },
  37: (state: RootState) => {
    let newState = {...state}
    newState.settings.customCSS = ''
    return newState
  },
  38: (state: RootState) => {
    let newState = {...state}
    newState.settings.enableStyleCustomization = false
    return newState
  },
  39: (state: RootState) => {
    let newState = {...state}
    newState.settings.enableUserDebugTools = false
    return newState
  },
  40: (state: RootState) => {
    let newState = {...state}
    newState.settings.enableReviews = false
    return newState
  },
  41: (state: RootState) => {
    let newState = {...state}
    // Add clarification state to all existing threads
    newState.chat.threads.forEach((thread: any) => {
      if (!thread.clarification) {
        thread.clarification = initialClarificationState
      }
    })
    return newState
  },
  42: (state: RootState) => {
    let newState = {...state}
    // @ts-ignore since no longer in state
    newState.settings.cardsMetadataHashes = {}
    return newState
  },
  43: (state: RootState) => {
    let newState = {...state}
    // Migrate cardsMetadataHashes to unified metadataHashes
    const oldSettings = newState.settings as any
    if (oldSettings.cardsMetadataHashes) {
      newState.settings.metadataHashes = oldSettings.cardsMetadataHashes
      delete oldSettings.cardsMetadataHashes
    } else {
      newState.settings.metadataHashes = {}
    }
    return newState
  },
  44: (state: RootState) => {
    let newState = {...state}
    // migrate enable_highlight_helpers in settings to default true
    newState.settings.enable_highlight_helpers = true
    return newState
  },
  45: (state: RootState) => {
    let newState = {...state}
    // Add metadataProcessingCache to settings
    newState.settings.metadataProcessingCache = {}
    return newState
  },
  46: (state: RootState) => {
    let newState = {...state}
    // Clear tasks objects in all threads except latest
    const activeThreadIndex = newState.chat.activeThread
    newState.chat.threads.forEach((thread, index: number) => {
      if (index !== activeThreadIndex) {
        thread.tasks = []
      }
    })
    return newState
  },
  47: (state: RootState) => {
    let newState = {...state}
    // Refresh metadataProcessingCache
    newState.settings.metadataProcessingCache = {}
    return newState
  },
  48: (state: RootState) => {
    let newState = {...state}
    // Refresh metadataProcessingCache
    newState.settings.drMode = true
    newState.settings.analystMode = true
    return newState
  },
  49: (state: RootState) => {
    let newState = {...state}
    // Refresh metadataProcessingCache
    newState.settings.enableReviews = true
    return newState
  },
  50: (state: RootState) => {
    let newState = {...state}
    // Refresh metadataProcessingCache
    newState.settings.currentEmail = newState.auth?.email
    return newState
  },
  51: (state: RootState) => {
    let newState = {...state}
    newState.settings.useV2States = true
    return newState
  },
  52: (state: RootState) => {
    let newState = {...state}
    // Set global last_warmed_on to the latest message's createdAt across all threads
    let latestMessageTime = 0
    newState.chat.threads.forEach((thread: any) => {
      if (thread.messages && thread.messages.length > 0) {
        const latestMessage = thread.messages[thread.messages.length - 1]
        if (latestMessage.createdAt > latestMessageTime) {
          latestMessageTime = latestMessage.createdAt
        }
      }
    })
    newState.chat.last_warmed_on = latestMessageTime
    return newState
  },
  53: (state: RootState) => {
    let newState = {...state}
    // Add embed_configs to settings
    newState.settings.embed_configs = {}
    return newState
  },
  54: (state: RootState) => {
    let newState = {...state}
    // Add availableAssets to settings
    newState.settings.availableAssets = []
    return newState
  },
  55: (state: RootState) => {
    let newState = {...state}
    // Add teamMemory
    newState.settings.useTeamMemory = true
    return newState
  },
  56: (state: RootState) => {
    let newState = {...state}
    // Migrate metadataHashes from Record<string, number> to Record<string, MetadataHashInfo>
    const oldHashes = newState.settings.metadataHashes as any
    if (oldHashes && typeof Object.values(oldHashes)[0] === 'number') {
      const newHashes: Record<string, any> = {}
      for (const [hash, timestamp] of Object.entries(oldHashes)) {
        newHashes[hash] = {
          timestamp: timestamp as number,
          metadataType: 'unknown',
          database_id: -1
        }
      }
      newState.settings.metadataHashes = newHashes
    }
    return newState
  },
  57: (state: RootState) => {
    let newState = {...state}
    newState.settings.selectedAssetId = null
    return newState
  },
  58: (state: RootState) => {
    let newState = {...state}
    newState.settings.useTeamMemory = false
    return newState
  },
  59: (state: RootState) => {
    let newState = {...state}
    // Ensure all tool call responses in chat messages are strings
    newState.chat.threads.forEach((thread) => {
      thread.messages.forEach((message) => {
        if (message.role === 'tool' && message.content && message.content.content !== undefined) {
          // If content is not already a string, convert it to string
          if (typeof message.content.content !== 'string') {
            message.content.content = JSON.stringify(message.content.content)
          }
        }
      })
    })
    return newState
  },
  60: (state: RootState) => {
    let newState = {...state}
    // Add savedQuestions to settings
    newState.settings.savedQuestions = []
    return newState
  },
  61: (state: RootState) => {
    let newState = {...state}
    // Set manuallyLimitContext to false and useTeamMemory to true
    newState.settings.manuallyLimitContext = false
    newState.settings.useTeamMemory = true
    return newState
  },
  62: (state: RootState) => {
    let newState = {...state}
    // Add tasks_id to all user messages
    newState.chat.threads.forEach((thread) => {
      thread.messages.forEach((message) => {
        if (message.role === 'user') {
          (message as any).tasks_id = null
        }
      })
    })
    return newState
  },
  63: (state: RootState) => {
    let newState = {...state}
    // Add useV2API flag for v2 chat planner API
    newState.settings.useV2API = false
    return newState
  },
  64: (state: RootState) => {
    let newState = {...state}
    // Clear planning messages and streaming contents (now include conversationID)
    // These are ephemeral fields that should only exist during active planning
    newState.chat.threads.forEach((thread) => {
      thread.planningMessage = undefined
      thread.streamingContents = undefined
    })
    return newState
  },
  65: (state: RootState) => {
    let newState = {...state}
    newState.settings.notifyUserStatus = 'incoming'
    return newState
  }
}

const BLACKLIST = ['billing', 'cache', userStateApi.reducerPath, atlasApi.reducerPath]

const persistConfig = {
  key: 'root',
  version: 65,
  storage,
  blacklist: BLACKLIST,
  // @ts-ignore
  migrate: createMigrate(migrations, { debug: true }),
};


export const eventListener = createListenerMiddleware();

export const store = configureStore({
  // TODO(@arpit): lack of migrations causes the whole typechecking thing to fail here :/
  // maybe have an explicit typecheck here so that failures are identified early? how
  // to even do that?
  reducer: persistReducer(persistConfig, rootReducer),
  middleware: (getDefaultMiddleware) => {
    const defaults = getDefaultMiddleware()
    const withPlannerAndCatalogListener = defaults
      .prepend(eventListener.middleware)
      .prepend(plannerListener.middleware)
      .concat(userStateApi.middleware)
      .concat(atlasApi.middleware)
    if (configs.IS_DEV) {
      return withPlannerAndCatalogListener.concat(logger)
    }
    return withPlannerAndCatalogListener
  }
})

export const getState = () => {
  return store.getState() as RootState
}

// @ts-ignore
window.__GET_STATE__ = () => {
  // @ts-ignore
  if (window.IS_PLAYWRIGHT) {
    return getState()
  }
}

// @ts-ignore
window.__DISPATCH__ = (action: Action) => {
  // @ts-ignore
  if (window.IS_PLAYWRIGHT) {
    return store.dispatch(action)
  }
}

// Infer the `RootState` and `AppDispatch` types from the store itself
// export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
