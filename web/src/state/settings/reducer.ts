import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { MetabaseModel } from 'apps/types';
import type { PayloadAction } from '@reduxjs/toolkit'
import { defaultIframeInfoWeb, getParsedIframeInfo, IframeInfoWeb } from '../../helpers/origin'
import { MxModel } from '../../helpers/utils'
import { AssetInfo } from '../../app/api/atlasApi'

export interface MetadataProcessingResult {
  cardsHash?: string;
  dbSchemaHash?: string;
  fieldsHash?: string;
  selectedDbId?: number;
}

export interface MetadataHashInfo {
  timestamp: number;
  metadataType: string;
  database_id: number;
}

interface MetadataProcessingCacheEntry {
  result: MetadataProcessingResult;
  timestamp: number;
}

export type AppMode = 'sidePanel' | 'selection'
export type SidePanelTabName = 'chat' | 'settings' | 'context'
export type DevToolsTabName = 'Context' | 'History' | 'Action History' | 'Prompts' | 'Available Actions' | 'Planner Configs' | 'Context History' | 'Testing Tools' | 'Custom Instructions' | 'General Settings' | 'Data Catalog' | 'Dev Context' | 'Memory' | 'CSS Customization' | 'Debug Tools' | 'Team Memory'

export const DEFAULT_TABLES = 'Default Tables'
const isEmbedded = getParsedIframeInfo().isEmbedded as unknown === 'true'

export const DEFAULT_MINUSXMD = isEmbedded ? '' : `
# minusx.md

This is a user-specific reference guide for MinusX. It contains user preferences wrt. essential data sources, common conventions, key business concepts, important metrics and terminologies. The general notes are written by the user. It also includes notable memories that are automatically updated by the agent.

### General Notes [added by the user]

---
### Notable Memories [added by MinusX agent]
`

const safeJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return {}
  }
};

export interface TableInfo {
  name: string
  schema: string
  dbId: number
}

export interface TableDiff {
  add: TableInfo[]
  remove: TableInfo[]
}


//--isAppOpen
//   |--yes
//   |  |--appMode: sidepanel
//   |  |  |--isDevToolsOpen
//   |  |  |  |--yes
//   |  |  |  |  '-- width: SidePanel + DevTools
//   |  |  |  |--no
//   |  |  |  |  '-- width: SidePanel
//   |  |--appMode: selection
//   |     '-- width: 100%
//   '--no



interface Settings {
  isLocal: boolean,
  uploadLogs: boolean,
  isAppOpen: boolean,
  appMode: AppMode,
  isDevToolsOpen: boolean,
  sidePanelTabName: SidePanelTabName,
  devToolsTabName: DevToolsTabName,
  suggestQueries: boolean,
  iframeInfo: IframeInfoWeb,
  confirmChanges: boolean
  demoMode: boolean
  intercomBooted: boolean
  isRecording: boolean
  aiRules: string
  tableDiff: TableDiff
  selectedModels: MetabaseModel[]
  drMode: boolean,
  analystMode: boolean,
  modelsMode: boolean
  viewAllCatalogs: boolean
  enable_highlight_helpers: boolean
  useMemory: boolean
  customCSS: string
  enableStyleCustomization: boolean,
  enableUserDebugTools: boolean
  enableReviews: boolean
  metadataHashes: Record<string, MetadataHashInfo>
  metadataProcessingCache: Record<number, MetadataProcessingCacheEntry>
  manuallyLimitContext: boolean
  useV2States: boolean
  useV2API: boolean
  currentEmail?: string
  availableAssets: AssetInfo[]
  selectedAssetId: string | null
  assetsLoading: boolean
  useTeamMemory: boolean
  savedQuestions: string[]
}

const initialState: Settings = {
  isLocal: false,
  uploadLogs: true,
  isAppOpen: true,
  appMode: 'sidePanel',
  isDevToolsOpen: false,
  sidePanelTabName: 'chat',
  devToolsTabName: 'General Settings',
  suggestQueries: false,
  iframeInfo: defaultIframeInfoWeb,
  confirmChanges: false,
  demoMode: false,
  intercomBooted: false,
  isRecording: false,
  aiRules: DEFAULT_MINUSXMD,
  tableDiff: {
    add: [],
    remove: []
  },
  selectedModels: [],
  drMode: true,
  analystMode: true,
  modelsMode: true,
  viewAllCatalogs: false,
  enable_highlight_helpers: true,
  useMemory: true,
  customCSS: '',
  enableStyleCustomization: false,
  enableUserDebugTools: false,
  enableReviews: true,
  metadataHashes: {},
  metadataProcessingCache: {},
  manuallyLimitContext: false,
  useV2States: true,
  useV2API: false,
  availableAssets: [],
  selectedAssetId: null,
  assetsLoading: false,
  useTeamMemory: false,
  savedQuestions: [],
}

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateIsLocal: (state, action: PayloadAction<boolean>) => {
      state.isLocal = action.payload
    },
    updateUploadLogs: (state, action: PayloadAction<boolean>) => {
      state.uploadLogs = action.payload
    },
    updateIsAppOpen: (state, action: PayloadAction<boolean>) => {
      state.isAppOpen = action.payload
    },
    updateAppMode: (state, action: PayloadAction<AppMode>) => {
      state.appMode = action.payload
    },
    updateIsDevToolsOpen: (state, action: PayloadAction<boolean>) => {
      state.isDevToolsOpen = action.payload
    },
    updateSidePanelTabName: (state, action: PayloadAction<SidePanelTabName>) => {
      state.sidePanelTabName = action.payload
    },
    updateDevToolsTabName: (state, action: PayloadAction<DevToolsTabName>) => {
      state.devToolsTabName = action.payload
    },
    setSuggestQueries: (state, action: PayloadAction<boolean>) => {
      state.suggestQueries = action.payload
    },
    setIframeInfo: (state, action: PayloadAction<IframeInfoWeb>) => {
      state.iframeInfo = action.payload
    },
    setConfirmChanges: (state, action: PayloadAction<boolean>) => {
      state.confirmChanges = action.payload
    },
    setDemoMode: (state, action: PayloadAction<boolean>) => {
      state.demoMode = action.payload
    },
    setModelsMode: (state, action: PayloadAction<boolean>) => {
      state.modelsMode = action.payload
    },
    setViewAllCatalogs: (state, action: PayloadAction<boolean>) => {
      state.viewAllCatalogs = action.payload
    },
    setAppRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload
    },
    setCurrentEmail: (state, action: PayloadAction<string | undefined>) => {
      state.currentEmail = action.payload
    },
    setAiRules: (state, action: PayloadAction<string>) => {
      state.aiRules = action.payload
    },
    addMemory: (state, action: PayloadAction<string>) => {
        const currentContent = state.aiRules || DEFAULT_MINUSXMD;
        const newContent = currentContent.trim() + "\n- " + action.payload;
        state.aiRules = newContent;
    },
    resetDefaultTablesDB(state, action: PayloadAction<{dbId: Number}>) {
      state.tableDiff.add = state.tableDiff.add.filter((t) => t.dbId != action.payload.dbId)
    },
    setSelectedModels: (state, action: PayloadAction<MetabaseModel[]>) => {
      state.selectedModels = action.payload
    },
    applyTableDiff(state, action: PayloadAction<{actionType: keyof TableDiff, tables: TableInfo[]}>) {
      const {actionType, tables} = action.payload
      
      if (actionType === 'add') {
        // Create a Set for O(1) lookups of existing tables
        const existingTablesSet = new Set(
          state.tableDiff.add.map(t => `${t.dbId}-${t.schema}-${t.name}`)
        );
        
        // Only add tables that don't already exist
        for (const table of tables) {
          const tableKey = `${table.dbId}-${table.schema}-${table.name}`;
          if (!existingTablesSet.has(tableKey)) {
            state.tableDiff.add.push(table);
          }
        }
      } else if (actionType === 'remove') {
        // Create a Set for O(1) lookups of tables to remove
        const tablesToRemoveSet = new Set(
          tables.map(t => `${t.dbId}-${t.schema}-${t.name}`)
        );
        
        // Filter out tables that should be removed
        state.tableDiff.add = state.tableDiff.add.filter(t => {
          const tableKey = `${t.dbId}-${t.schema}-${t.name}`;
          return !tablesToRemoveSet.has(tableKey);
        });
      }
    },
    setDRMode: (state, action: PayloadAction<boolean>) => {
      state.drMode = action.payload
      // Auto-disable analyst mode when DR mode is disabled
      if (!action.payload) {
        state.analystMode = false
      }
    },
    setAnalystMode: (state, action: PayloadAction<boolean>) => {
      // Only allow analyst mode if DR mode is enabled
      if (state.drMode) {
        state.analystMode = action.payload
      }
    },
    setUseMemory: (state, action: PayloadAction<boolean>) => {
      state.useMemory = action.payload
    },
    setUseTeamMemory: (state, action: PayloadAction<boolean>) => {
        state.useTeamMemory = action.payload
    },
    setEnableHighlightHelpers: (state, action: PayloadAction<boolean>) => {
      state.enable_highlight_helpers = action.payload
    },
    setCustomCSS: (state, action: PayloadAction<string>) => {
      state.customCSS = action.payload
    },
    setEnableStyleCustomization: (state, action: PayloadAction<boolean>) => {
      state.enableStyleCustomization = action.payload
    },
    setEnableUserDebugTools: (state, action: PayloadAction<boolean>) => {
        state.enableUserDebugTools = action.payload
    },
    setEnableReviews: (state, action: PayloadAction<boolean>) => {
        state.enableReviews = action.payload
    },
    setMetadataHash: (state, action: PayloadAction<{hash: string, metadataType: string, database_id: number}>) => {
        state.metadataHashes[action.payload.hash] = {
          timestamp: Date.now(),
          metadataType: action.payload.metadataType,
          database_id: action.payload.database_id
        }
    },
    setMetadataProcessingCache: (state, action: PayloadAction<{dbId: number, result: MetadataProcessingResult}>) => {
        state.metadataProcessingCache[action.payload.dbId] = {
          result: action.payload.result,
          timestamp: Date.now()
        }
    },
    clearMetadataProcessingCache: (state, action: PayloadAction<number>) => {
        delete state.metadataProcessingCache[action.payload]
    },
    updateManualContextSelection: (state, action: PayloadAction<boolean>) => {
      state.manuallyLimitContext = action.payload
    },
    setUseV2States: (state, action: PayloadAction<boolean>) => {
      state.useV2States = action.payload
    },
    setUseV2API: (state, action: PayloadAction<boolean>) => {
      state.useV2API = action.payload
    },
    setAvailableAssets: (state, action: PayloadAction<AssetInfo[]>) => {
      state.availableAssets = action.payload
      // Auto-select first asset if no asset is currently selected and assets are available
      if (action.payload.length > 0 && !state.selectedAssetId) {
        state.selectedAssetId = action.payload[0].slug
      }
    },
    setSelectedAssetId: (state, action: PayloadAction<string | null>) => {
      state.selectedAssetId = action.payload
    },
    setAssetsLoading: (state, action: PayloadAction<boolean>) => {
      state.assetsLoading = action.payload
    },
    addSavedQuestion: (state, action: PayloadAction<string>) => {
      if (!state.savedQuestions.includes(action.payload)) {
        state.savedQuestions.push(action.payload)
      }
    },
    removeSavedQuestion: (state, action: PayloadAction<string>) => {
      state.savedQuestions = state.savedQuestions.filter(question => question !== action.payload)
    },
    setSavedQuestions: (state, action: PayloadAction<string[]>) => {
      state.savedQuestions = action.payload
    },
  },
})


// Action creators are generated for each case reducer function
export const { updateIsLocal, updateUploadLogs,
  updateIsAppOpen, updateAppMode, updateIsDevToolsOpen,
  updateSidePanelTabName, updateDevToolsTabName, setSuggestQueries,
  setIframeInfo, setConfirmChanges, setDemoMode, setAppRecording, setAiRules,
  applyTableDiff, setSelectedModels, setDRMode, setAnalystMode,
  resetDefaultTablesDB, setModelsMode, setViewAllCatalogs, setEnableHighlightHelpers, setUseMemory, addMemory, setCustomCSS, setEnableStyleCustomization, setEnableUserDebugTools, setEnableReviews, setMetadataHash, setMetadataProcessingCache, clearMetadataProcessingCache,
  updateManualContextSelection, setUseV2States, setUseV2API, setCurrentEmail, setAvailableAssets, setSelectedAssetId, setAssetsLoading, setUseTeamMemory, addSavedQuestion, removeSavedQuestion, setSavedQuestions
} = settingsSlice.actions

export default settingsSlice.reducer
