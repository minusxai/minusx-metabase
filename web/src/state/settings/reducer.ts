import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { defaultIframeInfoWeb, IframeInfoWeb } from '../../helpers/origin'
import { isEqual } from 'lodash'
import { contains } from '../../helpers/utils'

export type AppMode = 'sidePanel' | 'selection'
export type SidePanelTabName = 'chat' | 'settings' | 'context'
export type DevToolsTabName = 'Context' | 'Action History' | 'Prompts' | 'Available Actions' | 'Planner Configs' | 'Context History' | 'Testing Tools' | 'Custom Instructions' | 'General Settings' | 'Data Catalog' | 'Dev Context'

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
  id: string
  name: string
  value: string
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
  selectedCatalog: '',
  availableCatalogs: [],
  defaultTableCatalog: {
    id: 'default',
    name: 'Default Tables',
    value: 'tables',
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
    applyTableDiff(state, action: PayloadAction<{actionType: keyof TableDiff, table: TableInfo}>) {
      const {actionType, table} = action.payload
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
    },
    setDRMode: (state, action: PayloadAction<boolean>) => {
      state.drMode = action.payload
    },
    setSelectedCatalog: (state, action: PayloadAction<string>) => {
      state.selectedCatalog = action.payload
    },
    saveCatalog: (state, action: PayloadAction<Omit<ContextCatalog, 'allowWrite'>>) => {
        const { id, name, value, content, dbName } = action.payload
        const existingCatalog = state.availableCatalogs.find(catalog => catalog.value === value)
        if (existingCatalog) {
            existingCatalog.content = content
            existingCatalog.dbName = dbName
        } else {
            state.availableCatalogs.push({ id, name, value, content, dbName, allowWrite: true })
        }
    },
    setCatalogs: (state, action: PayloadAction<ContextCatalog[]>) => {
        state.availableCatalogs = action.payload
    },
    setMemberships: (state, action: PayloadAction<SetMembershipsPayload>) => {
      const { groups, assets, members, currentUserId } = action.payload

      // Map assets to ContextCatalogs
      state.availableCatalogs = assets.map((asset): ContextCatalog => {
        const parsedContents = typeof asset.contents === "string"
          ? safeJSON(asset.contents)
          : asset.contents

        return {
          id: asset.id,
          name: asset.name,
          value: asset.name,
          content: parsedContents.content || "",
          dbName: parsedContents.dbName || "",
          allowWrite: asset.owner === currentUserId,
          owner: asset.owner,
          primaryGroup: groups.find(g =>
            g.assets?.includes(asset.id))?.id
        }
      })

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
        const catalogToDelete = state.availableCatalogs.find(catalog => catalog.value === action.payload)
        if (catalogToDelete) {
            state.availableCatalogs = state.availableCatalogs.filter(catalog => catalog.value !== action.payload)
            if (state.selectedCatalog === action.payload) {
                state.selectedCatalog = ''
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
  applyTableDiff, setDRMode, setSelectedCatalog, saveCatalog, deleteCatalog, setCatalogs, setMemberships, setGroupsEnabled
} = settingsSlice.actions

export default settingsSlice.reducer
