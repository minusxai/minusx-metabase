import { FormattedTable, MetabaseModel } from 'apps/types'

// Unified mention item interface
export interface MentionItem {
  type: 'table' | 'model'
  id: number | string
  name: string
  originalName: string // Original name with spaces preserved
  displayName: string // For showing in UI (e.g., "users (table)")
  description?: string
  schema?: string // For tables: database schema name
  collection?: string // For models: collection name
}

// Convert tables and models to unified mention items
export const createMentionItems = (
  tables: FormattedTable[],
  models: MetabaseModel[]
): MentionItem[] => {
  const tableItems: MentionItem[] = tables.map(table => {
    const normalizedName = table.name.replace(/[^\w]/g, '_')
    return {
      type: 'table' as const,
      id: table.id,
      name: normalizedName,
      originalName: table.name,
      displayName: `${normalizedName} (table)`,
      description: table.description,
      schema: table.schema
    }
  })

  const modelItems: MentionItem[] = models.map(model => {
    const normalizedName = model.name.replace(/[^\w]/g, '_')
    return {
      type: 'model' as const,
      id: model.modelId,
      name: normalizedName,
      originalName: model.name,
      displayName: `${normalizedName} (model)`,
      description: model.description,
      collection: model.collectionName || undefined
    }
  })

  return [...tableItems, ...modelItems].sort((a, b) => a.name.localeCompare(b.name))
}

// Filter mention items by search query
export const filterMentionItems = (items: MentionItem[], query: string): MentionItem[] => {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return items

  return items.filter(item => 
    item.name.toLowerCase().includes(normalizedQuery) ||
    (item.description && item.description.toLowerCase().includes(normalizedQuery))
  )
}

// Cache for mention maps to avoid recreating on every call
const mentionMapCache = new WeakMap<MentionItem[], Map<string, MentionItem>>()

// Parse @ mentions from display format to storage format
// Converts: "Check @users table" -> "Check @{type:table,id:123} table"
export const convertMentionsToStorage = (
  text: string,
  mentionItems: MentionItem[]
): string => {
  // Use cached map or create new one
  let mentionMap = mentionMapCache.get(mentionItems)
  if (!mentionMap) {
    mentionMap = new Map<string, MentionItem>()
    mentionItems.forEach(item => {
      mentionMap!.set(item.name.toLowerCase(), item)
    })
    mentionMapCache.set(mentionItems, mentionMap)
  }

  // Regex to find @mentions - matches @word_characters
  const mentionRegex = /@(\w+)/g
  
  return text.replace(mentionRegex, (match, name) => {
    const item = mentionMap!.get(name.toLowerCase())
    if (item) {
      return `@{type:${item.type},id:${item.id}}`
    }
    return match // Leave unmatched mentions as-is
  })
}

// Cache for display mention maps to avoid recreating on every call
const displayMentionMapCache = new WeakMap<MentionItem[], Map<string, MentionItem>>()

// Parse @ mentions from storage format to display format
// Converts: "Check @{type:table,id:123} table" -> "Check @users table"
export const convertMentionsToDisplay = (
  text: string,
  mentionItems: MentionItem[]
): string => {
  // Use cached map or create new one
  let mentionMap = displayMentionMapCache.get(mentionItems)
  if (!mentionMap) {
    mentionMap = new Map<string, MentionItem>()
    mentionItems.forEach(item => {
      mentionMap!.set(`${item.type}:${item.id}`, item)
    })
    displayMentionMapCache.set(mentionItems, mentionMap)
  }

  // Regex to find storage format mentions
  const storageRegex = /@\{type:(table|model),id:(\w+)\}/g
  
  return text.replace(storageRegex, (_match, type, id) => {
    const item = mentionMap!.get(`${type}:${id}`)
    if (item) {
      return `\`[mention:${type}:${item.name}]\``
    }
    return `\`[mention:missing:${type}:${id}]\`` // Fallback for missing references
  })
}

// Find @ character position and partial mention query
export const detectMentionAtCursor = (
  text: string,
  cursorPosition: number
): { mentionStart: number; query: string } | null => {
  // Look backwards from cursor to find last @
  let mentionStart = -1
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '@') {
      // Check if this @ is already part of a completed mention
      const restOfText = text.slice(i)
      const storageFormatMatch = restOfText.match(/^@\{type:(table|model),id:\w+\}/)
      if (storageFormatMatch) {
        // This is a completed mention, not active for editing
        break
      }
      mentionStart = i
      break
    }
    // Stop if we hit whitespace or other boundaries
    if (text[i] === ' ' || text[i] === '\n') {
      break
    }
  }

  if (mentionStart === -1) {
    return null
  }

  // Extract the partial query after @
  const query = text.slice(mentionStart + 1, cursorPosition)
  
  // Only return if we're directly after @ or typing word characters
  if (/^\w*$/.test(query)) {
    return { mentionStart, query }
  }

  return null
}

// Replace partial mention with completed mention
export const replaceMentionInText = (
  text: string,
  mentionStart: number,
  cursorPosition: number,
  selectedItem: MentionItem
): { newText: string; newCursorPosition: number } => {
  const beforeMention = text.slice(0, mentionStart)
  const afterCursor = text.slice(cursorPosition)
  const newMention = `@${selectedItem.name}`
  
  const newText = beforeMention + newMention + afterCursor
  const newCursorPosition = mentionStart + newMention.length

  return { newText, newCursorPosition }
}