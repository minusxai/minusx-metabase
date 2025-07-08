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
import { catalogsListener } from './settings/availableCatalogsListener'
import cache from './cache/reducer'
import notifications from './notifications/reducer'
import { userStateApi } from '../app/api/userStateApi'
import { get } from 'lodash'

const combinedReducer = combineReducers({
  chat,
  auth,
  settings,
  thumbnails,
  billing,
  semanticLayer,
  cache,
  notifications,
  [userStateApi.reducerPath]: userStateApi.reducer
});

const rootReducer = (state: any, action: any) => {
  let updatedState = state;

  switch (action.type) {
    case 'reset':
      updatedState = {
        auth: state.auth
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
    let newState = {...state}
    newState.settings.availableCatalogs.forEach((catalog: any) => {
      catalog.allowWrite = true
    })
    newState.settings.defaultTableCatalog.allowWrite = true
    newState.settings.users = {}
    newState.settings.groups = {}
    newState.settings.groupsEnabled = false
    return newState
  },
  24: (state: RootState) => {
    let newState = {...state}
    const selectedCatalog = newState.settings.selectedCatalog
    if (selectedCatalog == '' || selectedCatalog == 'tables') {
      newState.settings.selectedCatalog = DEFAULT_TABLES
    }
    if (!newState.settings.availableCatalogs.some((catalog: ContextCatalog) => catalog.name == selectedCatalog)) {
      newState.settings.selectedCatalog = DEFAULT_TABLES
    }
    return newState
  },
  25: (state: RootState) => {
    let newState = {...state}
    const selectedCatalog = newState.settings.selectedCatalog
    if (selectedCatalog == '' || selectedCatalog == 'tables') {
      newState.settings.selectedCatalog = DEFAULT_TABLES
    }
    if (!newState.settings.availableCatalogs.some((catalog: ContextCatalog) => catalog.name == selectedCatalog)) {
      newState.settings.selectedCatalog = DEFAULT_TABLES
    }
    return newState
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
    let newState = {...state}
    // Remove primaryGroup field from availableCatalogs
    if (newState.settings?.availableCatalogs) {
      newState.settings.availableCatalogs = newState.settings.availableCatalogs.map((catalog: any) => {
        const { primaryGroup, ...catalogWithoutPrimaryGroup } = catalog
        return catalogWithoutPrimaryGroup
      })
    }
    // Add assets array to existing groups if they don't have it
    if (newState.settings?.groups) {
      Object.keys(newState.settings.groups).forEach(groupId => {
        if (!newState.settings.groups[groupId].assets) {
          newState.settings.groups[groupId].assets = []
        }
      })
    }
    return newState
  },
  31: (state: RootState) => {
    let newState = {...state}
    newState.settings.modelsMode = true
    return newState
  },
  32: (state: RootState) => {
    // migrate all catalogs to remove from_ field
    // and replace with sql or sql_table
    let newState = {...state}
    let newCatalogs = newState.settings.availableCatalogs.map((catalog: any) => {
      let entities = get(catalog, 'content.entities', [])
      entities = entities.map((entity: any) => {
        let from_ = get(entity, 'from_')
        if (from_) {
          if (typeof from_ === 'string') {
            entity.sql_table = from_
          } else {
            entity.sql = get(from_, 'sql', '')
          }
          delete entity.from_
        }
        return entity
      })
      catalog.content.entities = entities
      return catalog
    })
    newState.settings.availableCatalogs = newCatalogs
    return newState
  },
  33: (state: RootState) => {
    let newState = {...state}
    newState.notifications = {
      notifications: [],
      isPolling: false,
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
  }
}

const persistConfig = {
  key: 'root',
  version: 43,
  storage,
  blacklist: ['billing', 'cache', userStateApi.reducerPath],
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
      .prepend(catalogsListener.middleware)
      .concat(userStateApi.middleware)
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
