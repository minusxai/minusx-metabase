import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { defaultIframeInfoWeb, IframeInfoWeb } from '../../helpers/origin'
import { isEqual } from 'lodash'
import { contains } from '../../helpers/utils'

export type AppMode = 'sidePanel' | 'selection'
export type SidePanelTabName = 'chat' | 'settings' | 'context'
export type DevToolsTabName = 'Context' | 'Action History' | 'Prompts' | 'Available Actions' | 'Planner Configs' | 'Context History' | 'Testing Tools' | 'Custom Instructions' | 'General Settings' | 'Data Catalog' | 'Dev Context'

export const DEFAULT_TABLES = 'Default Tables'

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

export interface ContextCatalog {
  type: 'manual' | 'aiGenerated'
  id: string
  name: string
  content: any
  dbName: string
  allowWrite: boolean
  primaryGroup?: string
  owner?: string
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
  savedQueries: boolean
  tableDiff: TableDiff
  drMode: boolean,
  selectedCatalog: string,
  availableCatalogs: ContextCatalog[],
  defaultTableCatalog: ContextCatalog
  users: Record<string, UserInfo>
  groups: Record<string, UserGroup>
  groupsEnabled: boolean
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
  aiRules: '',
  savedQueries: false,
  tableDiff: {
    add: [],
    remove: []
  },
  drMode: false,
  selectedCatalog: DEFAULT_TABLES,
  availableCatalogs: [],
  defaultTableCatalog: {
    type: 'manual',
    id: 'default',
    name: DEFAULT_TABLES,
    content: {},
    dbName: '',
    allowWrite: true
  },
  users: {},
  groups: {},
  groupsEnabled: false
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
    setAppRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload
    },
    setAiRules: (state, action: PayloadAction<string>) => {
      state.aiRules = action.payload
    },
    setSavedQueries: (state, action: PayloadAction<boolean>) => {
      state.savedQueries = action.payload
    },
    resetDefaultTablesDB(state, action: PayloadAction<{dbId: Number}>) {
      state.tableDiff.add = state.tableDiff.add.filter((t) => t.dbId != action.payload.dbId)
      state.defaultTableCatalog.content = {
        "tables": state.tableDiff.add.map((t) => {
            return {
                name: t.name
            }
        })
      }
    },
    applyTableDiff(state, action: PayloadAction<{actionType: keyof TableDiff, tables: TableInfo[]}>) {
      const {actionType, tables} = action.payload
      for (const table of tables) {
        if (actionType === 'add') {
          if (!contains(state.tableDiff.add, table)) {
            state.tableDiff.add.push(table)
          }
        } else if (actionType === 'remove') {
          if (contains(state.tableDiff.add, table)) {
            state.tableDiff.add = state.tableDiff.add.filter((t) => !isEqual(t, table))
          }
        }
        state.defaultTableCatalog.content = {
          "tables": state.tableDiff.add.map((t) => {
              return {
                  name: t.name
              }
          })
        }
      } 
    },
    setDRMode: (state, action: PayloadAction<boolean>) => {
      state.drMode = action.payload
    },
    setSelectedCatalog: (state, action: PayloadAction<string>) => {
      state.selectedCatalog = action.payload
    },
    saveCatalog: (state, action: PayloadAction<Omit<ContextCatalog, 'allowWrite'> & { currentUserId: string }>) => {
        const { type, id, name, content, dbName, currentUserId } = action.payload
        const existingCatalog = state.availableCatalogs.find(catalog => catalog.id === id)
        if (existingCatalog) {
          if (state.selectedCatalog == existingCatalog.name) {
            state.selectedCatalog = name
          }
          existingCatalog.name = name
          existingCatalog.content = content
          existingCatalog.dbName = dbName
          existingCatalog.owner = currentUserId
          existingCatalog.allowWrite = true
        } else {
          state.availableCatalogs.push({ type, id, name, content, dbName, allowWrite: true, owner: currentUserId })
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
          allowWrite: asset.owner === currentUserId,
          owner: asset.owner,
          primaryGroup: groups.find(g =>
            g.assets?.includes(asset.id))?.id
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
          }))
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
    }    
  }
})

// Action creators are generated for each case reducer function
export const { updateIsLocal, updateUploadLogs,
  updateIsAppOpen, updateAppMode, updateIsDevToolsOpen,
  updateSidePanelTabName, updateDevToolsTabName, setSuggestQueries,
  setIframeInfo, setConfirmChanges, setDemoMode, setAppRecording, setAiRules, setSavedQueries,
  applyTableDiff, setDRMode, setSelectedCatalog, saveCatalog, deleteCatalog, setMemberships,
  setGroupsEnabled, resetDefaultTablesDB
} = settingsSlice.actions

export default settingsSlice.reducer
