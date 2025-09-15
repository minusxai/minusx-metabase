import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { TextareaProps, Box } from '@chakra-ui/react'
import AutosizeTextarea from './AutosizeTextarea'
import { MentionDropdown } from './MentionDropdown'
import { 
  MentionItem,
  detectMentionAtCursor,
  filterMentionItems,
  replaceMentionInText,
  convertMentionsToDisplay
} from '../../helpers/mentionUtils'
import { debounce } from 'lodash'

interface MentionTextareaProps extends Omit<TextareaProps, 'onChange'> {
  mentionItems: MentionItem[]
  onChange?: (event: { target: { value: string } }) => void
}

export const MentionTextarea = forwardRef<HTMLDivElement, MentionTextareaProps>(
  ({ mentionItems, value, onChange, onKeyDown, placeholder = 'Ask Anything!', ...props }, ref) => {
    const editableRef = useRef<HTMLDivElement>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredItems, setFilteredItems] = useState<MentionItem[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionStart, setMentionStart] = useState(-1)
    const typingTimerRef = useRef<NodeJS.Timeout>()

    // Forward ref to the contenteditable div
    useImperativeHandle(ref, () => editableRef.current!, [])

    // Debounced search function to avoid searching on every keystroke
    const debouncedSearch = useMemo(
      () => debounce((query: string) => {
        const filtered = filterMentionItems(mentionItems, query)
        setFilteredItems(filtered)
        
        // Calculate dropdown position after filtering
        setTimeout(() => {
          const itemHeight = 80 // Updated for 4-line items (name + type + description + schema/collection)
          const maxItems = 6
          const actualItems = Math.min(filtered.length, maxItems)
          const dropdownHeight = actualItems * itemHeight + 10
          
          const position = {
            top: -(dropdownHeight + 5),
            left: 0
          }
          
          setDropdownPosition(position)
        }, 0)
      }, 150),
      [mentionItems]
    )


    // Get plain text content from contenteditable div
    const getTextContent = useCallback(() => {
      if (!editableRef.current) return ''
      return editableRef.current.textContent || ''
    }, [])

    // Set cursor position in contenteditable div
    const setCursorPosition = useCallback((position: number) => {
      if (!editableRef.current) return
      const range = document.createRange()
      const sel = window.getSelection()
      
      let charCount = 0
      const walker = document.createTreeWalker(
        editableRef.current,
        NodeFilter.SHOW_TEXT,
        null
      )
      
      let node
      while (node = walker.nextNode()) {
        const textLength = node.textContent?.length || 0
        if (charCount + textLength >= position) {
          range.setStart(node, position - charCount)
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
          return
        }
        charCount += textLength
      }
    }, [])

    // Get cursor position in contenteditable div
    const getCursorPosition = useCallback(() => {
      const sel = window.getSelection()
      if (!sel?.rangeCount || !editableRef.current) return 0
      
      const range = sel.getRangeAt(0).cloneRange()
      range.selectNodeContents(editableRef.current)
      range.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset)
      return range.toString().length
    }, [])

    // Update content with highlighted mentions
    const updateContent = useCallback((text: string) => {
      if (!editableRef.current) return
      
      // Convert storage format mentions to display format
      const displayText = convertMentionsToDisplay(text, mentionItems)
      
      // Create a map for quick mention lookup
      const mentionMap = new Map<string, MentionItem>()
      mentionItems.forEach(item => {
        mentionMap.set(item.name.toLowerCase(), item)
      })
      
      // Split text by mentions and create HTML with highlights and tooltips
      const parts = displayText.split(/(@\w+)/g)
      const html = parts.map((part: string, _index: number) => {
        if (part.startsWith('@')) {
          const mentionName = part.substring(1).toLowerCase()
          const mentionItem = mentionMap.get(mentionName)
          
          let tooltipText = ''
          if (mentionItem) {
            tooltipText = `Name: ${mentionItem.originalName}`
            if (mentionItem.schema) tooltipText += ` | Schema: ${mentionItem.schema}`
            if (mentionItem.collection) tooltipText += ` | Collection: ${mentionItem.collection}`
          }
          
          return `<span style="background-color: #EBF8FF; color: #2B6CB0; padding: 2px 4px; border-radius: 4px; font-weight: 500;" title="${tooltipText}">${part}</span>`
        }
        // Wrap regular text in spans with explicit black color to prevent blue bleeding
        return `<span style="color: black;">${part.replace(/\n/g, '<br>')}</span>`
      }).join('')
      
      editableRef.current.innerHTML = html
    }, [mentionItems])

    // Handle input changes
    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
      const newValue = getTextContent()
      const cursorPosition = getCursorPosition()
      
      // Call original onChange
      if (onChange) {
        onChange({ target: { value: newValue } })
      }

      // Debounce content updates to avoid cursor issues
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
      typingTimerRef.current = setTimeout(() => {
        if (editableRef.current && document.activeElement === editableRef.current) {
          const currentCursor = getCursorPosition()
          updateContent(newValue)
          setCursorPosition(currentCursor)
        }
      }, 500) // Update after 500ms of no typing

      // Detect mention at cursor
      const mentionInfo = detectMentionAtCursor(newValue, cursorPosition)
      
      if (mentionInfo) {
        setMentionStart(mentionInfo.mentionStart)
        setMentionQuery(mentionInfo.query)
        setShowDropdown(true)
        setSelectedIndex(0)
        
        // Use debounced search instead of immediate filtering
        debouncedSearch(mentionInfo.query)
      } else {
        setShowDropdown(false)
        setMentionQuery('')
        setMentionStart(-1)
        // Cancel any pending debounced search
        debouncedSearch.cancel()
      }
    }, [onChange, mentionItems, getTextContent, getCursorPosition, updateContent, setCursorPosition, debouncedSearch])

    // Handle mention selection
    const handleMentionSelect = useCallback((item: MentionItem) => {
      if (!editableRef.current || mentionStart === -1) return

      // Clear any pending content updates to prevent conflicts
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }

      const currentValue = getTextContent()
      const cursorPosition = getCursorPosition()
      
      const { newText, newCursorPosition } = replaceMentionInText(
        currentValue,
        mentionStart,
        cursorPosition,
        item
      )

      // Update content with highlighted mentions immediately
      updateContent(newText)
      
      // Set cursor position after a brief delay to ensure content is updated
      setTimeout(() => {
        setCursorPosition(newCursorPosition)
      }, 10)
      
      // Notify parent of change
      if (onChange) {
        onChange({ target: { value: newText } })
      }

      // Close dropdown
      setShowDropdown(false)
      setMentionQuery('')
      setMentionStart(-1)
      
      // Focus back to contenteditable
      editableRef.current.focus()
    }, [mentionStart, onChange, getTextContent, getCursorPosition, setCursorPosition, updateContent])

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (showDropdown && filteredItems.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % filteredItems.length)
            break
          case 'ArrowUp':
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
            break
          case 'Enter':
            if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
              e.preventDefault()
              handleMentionSelect(filteredItems[selectedIndex])
              return
            }
            break
          case 'Escape':
            e.preventDefault()
            setShowDropdown(false)
            break
          case 'Tab':
            if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
              e.preventDefault()
              handleMentionSelect(filteredItems[selectedIndex])
              return
            }
            break
        }
      }

      // Call original onKeyDown
      if (onKeyDown) {
        onKeyDown(e)
      }
    }, [showDropdown, filteredItems, selectedIndex, handleMentionSelect, onKeyDown])

    // Update content when value prop changes (only if not focused)
    useEffect(() => {
      if (value !== undefined && editableRef.current && document.activeElement !== editableRef.current) {
        updateContent(value)
      }
    }, [value, updateContent])

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = () => {
        setShowDropdown(false)
      }

      if (showDropdown) {
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
      }
    }, [showDropdown])

    // Cleanup debounced function on unmount
    useEffect(() => {
      return () => {
        debouncedSearch.cancel()
      }
    }, [debouncedSearch])

    return (
      <Box position="relative">
        <Box
          maxHeight={500}
          position="relative"
          _focusWithin={{
            borderColor: 'minusxGreen.600',
            borderWidth: '1px',
            borderRadius: 'lg',
          }}
          border='1px solid #ccc'
          borderRadius='lg'
          bg='minusxBW.50'
        >
          <Box
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            minH="48px"
            maxHeight={300}
            overflow="auto"
            w="100%"
            p="8px 12px"
            fontSize="14px"
            lineHeight="1.4"
            outline="none"
            dir="ltr"
            textAlign="left"
            _empty={{
              _before: {
                content: `"${placeholder}"`,
                color: 'gray.400',
                pointerEvents: 'none'
              }
            }}
            {...props}
          />
          <Box
            height="50px"
            pointerEvents="none"
          />
        </Box>
        
        <MentionDropdown
          items={filteredItems}
          selectedIndex={selectedIndex}
          onSelect={handleMentionSelect}
          onClose={() => setShowDropdown(false)}
          position={dropdownPosition}
          visible={showDropdown}
        />
      </Box>
    )
  }
)

MentionTextarea.displayName = 'MentionTextarea'