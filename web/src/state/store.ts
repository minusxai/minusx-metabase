import { Action, combineReducers, configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import chat, { initialUserConfirmationState, initialTasks, getID } from './chat/reducer'
import auth from './auth/reducer'
import thumbnails from './thumbnails/reducer'
import settings, { ContextCatalog, DEFAULT_TABLES } from './settings/reducer'
import storage from 'redux-persist/lib/storage'
import { persistReducer, createMigrate } from 'redux-persist'
import logger from 'redux-logger'
import { configs } from '../constants'
import { plannerListener } from '../planner/planner'
import billing from './billing/reducer'
import semanticLayer from './semantic-layer/reducer'

const combinedReducer = combineReducers({
  chat,
  auth,
  settings,
  thumbnails,
  billing,
  semanticLayer
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
  26: (state: RootState) => {
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
    newState.settings.snippetsMode = false
    return newState
  }
}

const persistConfig = {
  key: 'root',
  version: 27,
  storage,
  blacklist: ['billing'],
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
    const withPlanner = defaults.prepend(eventListener.middleware).prepend(plannerListener.middleware)
    if (configs.IS_DEV) {
      return withPlanner.concat(logger)
    }
    return withPlanner
  }
})

export const getState = () => {
  return store.getState() as RootState
}

window.__GET_STATE__ = () => {
  if (window.IS_PLAYWRIGHT) {
    return getState()
  }
}

window.__DISPATCH__ = (action: Action) => {
  if (window.IS_PLAYWRIGHT) {
    return store.dispatch(action)
  }
}

// Infer the `RootState` and `AppDispatch` types from the store itself
// export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
