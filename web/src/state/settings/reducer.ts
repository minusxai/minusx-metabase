import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { MetabaseModel } from 'apps/types';
import type { PayloadAction } from '@reduxjs/toolkit'
import { defaultIframeInfoWeb, IframeInfoWeb } from '../../helpers/origin'
import { ContextCatalog, MxModel } from '../../helpers/utils'

export interface MetadataProcessingResult {
  cardsHash?: string;
  dbSchemaHash?: string;
  fieldsHash?: string;
  modelFieldsHash?: string;
}

interface MetadataProcessingCacheEntry {
  result: MetadataProcessingResult;
  timestamp: number;
}

export type AppMode = 'sidePanel' | 'selection'
export type SidePanelTabName = 'chat' | 'settings' | 'context'
export type DevToolsTabName = 'Context' | 'History' | 'Action History' | 'Prompts' | 'Available Actions' | 'Planner Configs' | 'Context History' | 'Testing Tools' | 'Custom Instructions' | 'General Settings' | 'Data Catalog' | 'Dev Context' | 'Memory' | 'CSS Customization' | 'Debug Tools'

export const DEFAULT_TABLES = 'Default Tables'

export const DEFAULT_MINUSXMD = `
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

interface UserPermission {
  id: string
  permission: string
}

export interface UserGroup {
  id: string
  created_at: string
  updated_at: string
  name: string
  owner: any,
  permission: string
  members: UserPermission[]
  assets?: string[]
}

export interface UserInfo {
  id: string
  created_at: string
  updated_at: string
  email_id: string
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

interface SetMembershipsPayload {
  groups: any[]
  assets: any[]
  members: any[]
  currentUserId: string
}

export interface SaveCatalogPayload extends Omit<ContextCatalog, 'allowWrite'> {
  currentUserId: string
}

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
  selectedCatalog: string,
  availableCatalogs: ContextCatalog[],
  users: Record<string, UserInfo>
  groups: Record<string, UserGroup>
  groupsEnabled: boolean
  modelsMode: boolean
  viewAllCatalogs: boolean
  enable_highlight_helpers: boolean
  useMemory: boolean
  customCSS: string
  enableStyleCustomization: boolean,
  enableUserDebugTools: boolean
  enableReviews: boolean
  metadataHashes: Record<string, number>
  metadataProcessingCache: Record<number, MetadataProcessingCacheEntry>
  manuallyLimitContext: boolean
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
  selectedCatalog: DEFAULT_TABLES,
  availableCatalogs: [],
  users: {},
  groups: {},
  groupsEnabled: false,
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
  manuallyLimitContext: false
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
    setGroupsEnabled: (state, action: PayloadAction<boolean>) => {
      state.groupsEnabled = action.payload
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
    setSelectedCatalog: (state, action: PayloadAction<string>) => {
      const newSelectedCatalog = action.payload
      if (newSelectedCatalog == DEFAULT_TABLES || state.availableCatalogs.some(catalog => catalog.name == newSelectedCatalog)) {
        state.selectedCatalog = action.payload
      }
    },
    saveCatalog: (state, action: PayloadAction<SaveCatalogPayload>) => {
        const { type, id, name, content, dbName, origin, currentUserId, dbId } = action.payload
        const existingCatalog = state.availableCatalogs.find(catalog => catalog.id === id)
        if (existingCatalog) {
          if (state.selectedCatalog == existingCatalog.name) {
            state.selectedCatalog = name
          }
          existingCatalog.name = name
          existingCatalog.content = content
          existingCatalog.dbName = dbName
          existingCatalog.dbId = dbId
          existingCatalog.origin = origin
          existingCatalog.owner = currentUserId
          existingCatalog.allowWrite = true
        } else {
          state.availableCatalogs.push({ type, id, name, content, dbName, dbId, origin, allowWrite: true, owner: currentUserId })
        }
    },
    setMemberships: (state, action: PayloadAction<SetMembershipsPayload>) => {
      const { groups, assets, members, currentUserId } = action.payload

      // Map assets to ContextCatalogs
      state.availableCatalogs = assets.map((asset): ContextCatalog => {
        const parsedContents = typeof asset.contents === "string"
          ? safeJSON(asset.contents)
          : asset.contents

        return {
          type: 'manual',
          id: asset.id,
          name: asset.name,
          content: parsedContents.content || "",
          dbName: parsedContents.dbName || "",
          dbId: parsedContents.dbId || 0,
          origin: parsedContents.origin || "",
          allowWrite: asset.owner === currentUserId,
          owner: asset.owner
        }
      })
      if (!state.availableCatalogs.some(catalog => catalog.name == state.selectedCatalog)) {
        state.selectedCatalog = DEFAULT_TABLES
      }

      // Map users by ID
      state.users = {}
      members.forEach((member: any) => {
        state.users[member.id] = {
          id: member.id,
          created_at: member.created_at,
          updated_at: member.updated_at,
          email_id: member.login_email_id,
        }
      })

      // Map groups by ID and normalize members
      state.groups = {}
      groups.forEach((group: any) => {
        const formattedGroup: UserGroup = {
          id: group.id,
          created_at: group.created_at,
          updated_at: group.updated_at,
          name: group.name,
          owner: group.owner,
          permission: group.permission,
          members: (group.members || []).map((m: any): UserPermission => ({
            id: m.id,
            permission: m.permission
          })),
          assets: group.assets || []
        }
        state.groups[group.id] = formattedGroup
      })
    },
    deleteCatalog: (state, action: PayloadAction<string>) => {
        const catalogToDelete = state.availableCatalogs.find(catalog => catalog.name === action.payload)
        if (catalogToDelete) {
            state.availableCatalogs = state.availableCatalogs.filter(catalog => catalog.name !== action.payload)
            if (state.selectedCatalog === action.payload) {
                state.selectedCatalog = DEFAULT_TABLES
            }
        }
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
    setMetadataHash: (state, action: PayloadAction<string>) => {
        state.metadataHashes[action.payload] = Date.now()
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
    }
  },
})


// Action creators are generated for each case reducer function
export const { updateIsLocal, updateUploadLogs,
  updateIsAppOpen, updateAppMode, updateIsDevToolsOpen,
  updateSidePanelTabName, updateDevToolsTabName, setSuggestQueries,
  setIframeInfo, setConfirmChanges, setDemoMode, setAppRecording, setAiRules,
  applyTableDiff, setSelectedModels, setDRMode, setAnalystMode, setSelectedCatalog, saveCatalog, deleteCatalog, setMemberships,
  setGroupsEnabled, resetDefaultTablesDB, setModelsMode, setViewAllCatalogs, setEnableHighlightHelpers, setUseMemory, addMemory, setCustomCSS, setEnableStyleCustomization, setEnableUserDebugTools, setEnableReviews, setMetadataHash, setMetadataProcessingCache, clearMetadataProcessingCache,
  updateManualContextSelection
} = settingsSlice.actions

export default settingsSlice.reducer
