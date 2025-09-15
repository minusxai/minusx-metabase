import { FormattedTable, MetabaseModel } from 'apps/types'

// Unified mention item interface
export interface MentionItem {
  type: 'table' | 'model'
  id: number | string
  name: string
  displayName: string // For showing in UI (e.g., "users (table)")
  description?: string
}

// Convert tables and models to unified mention items
export const createMentionItems = (
  tables: FormattedTable[],
  models: MetabaseModel[]
): MentionItem[] => {
  const tableItems: MentionItem[] = tables.map(table => ({
    type: 'table' as const,
    id: table.id,
    name: table.name,
    displayName: `${table.name} (table)`,
    description: table.description
  }))

  const modelItems: MentionItem[] = models.map(model => ({
    type: 'model' as const,
    id: model.modelId,
    name: model.name,
    displayName: `${model.name} (model)`,
    description: model.description
  }))

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

// Parse @ mentions from display format to storage format
// Converts: "Check @users table" -> "Check @{type:table,id:123} table"
export const convertMentionsToStorage = (
  text: string,
  mentionItems: MentionItem[]
): string => {
  // Create a map for fast lookup by name
  const mentionMap = new Map<string, MentionItem>()
  mentionItems.forEach(item => {
    mentionMap.set(item.name.toLowerCase(), item)
  })

  // Regex to find @mentions - matches @word_characters
  const mentionRegex = /@(\w+)/g
  
  return text.replace(mentionRegex, (match, name) => {
    const item = mentionMap.get(name.toLowerCase())
    if (item) {
      return `@{type:${item.type},id:${item.id}}`
    }
    return match // Leave unmatched mentions as-is
  })
}

// Parse @ mentions from storage format to display format
// Converts: "Check @{type:table,id:123} table" -> "Check @users table"
export const convertMentionsToDisplay = (
  text: string,
  mentionItems: MentionItem[]
): string => {
  // Create a map for fast lookup by type and id
  const mentionMap = new Map<string, MentionItem>()
  mentionItems.forEach(item => {
    mentionMap.set(`${item.type}:${item.id}`, item)
  })

  // Regex to find storage format mentions
  const storageRegex = /@\{type:(table|model),id:(\w+)\}/g
  
  return text.replace(storageRegex, (match, type, id) => {
    const item = mentionMap.get(`${type}:${id}`)
    if (item) {
      return `@${item.name}`
    }
    return `@[${type}:${id}]` // Fallback for missing references
  })
}

// Find @ character position and partial mention query
export const detectMentionAtCursor = (
  text: string,
  cursorPosition: number
): { mentionStart: number; query: string } | null => {
  console.log('[detectMentionAtCursor] Input:', { text, cursorPosition, charAtCursor: text[cursorPosition - 1] })
  
  // Look backwards from cursor to find last @
  let mentionStart = -1
  for (let i = cursorPosition - 1; i >= 0; i--) {
    console.log(`[detectMentionAtCursor] Checking char at ${i}: "${text[i]}"`)
    if (text[i] === '@') {
      // Check if this @ is already part of a completed mention
      const restOfText = text.slice(i)
      const storageFormatMatch = restOfText.match(/^@\{type:(table|model),id:\w+\}/)
      if (storageFormatMatch) {
        console.log('[detectMentionAtCursor] Found completed mention, stopping')
        // This is a completed mention, not active for editing
        break
      }
      mentionStart = i
      console.log('[detectMentionAtCursor] Found @ at position:', i)
      break
    }
    // Stop if we hit whitespace or other boundaries
    if (text[i] === ' ' || text[i] === '\n') {
      console.log('[detectMentionAtCursor] Hit boundary, stopping')
      break
    }
  }

  if (mentionStart === -1) {
    console.log('[detectMentionAtCursor] No @ found')
    return null
  }

  // Extract the partial query after @
  const query = text.slice(mentionStart + 1, cursorPosition)
  console.log('[detectMentionAtCursor] Query extracted:', query)
  
  // Only return if we're directly after @ or typing word characters
  if (/^\w*$/.test(query)) {
    console.log('[detectMentionAtCursor] Valid query, returning mention info')
    return { mentionStart, query }
  }

  console.log('[detectMentionAtCursor] Invalid query format')
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