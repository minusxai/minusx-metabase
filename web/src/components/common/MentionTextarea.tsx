import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { TextareaProps, Box } from '@chakra-ui/react'
import AutosizeTextarea from './AutosizeTextarea'
import { MentionDropdown } from './MentionDropdown'
import { 
  MentionItem,
  detectMentionAtCursor,
  filterMentionItems,
  replaceMentionInText
} from '../../helpers/mentionUtils'

interface MentionTextareaProps extends TextareaProps {
  mentionItems: MentionItem[]
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ mentionItems, value, onChange, onKeyDown, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredItems, setFilteredItems] = useState<MentionItem[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionStart, setMentionStart] = useState(-1)

    // Forward ref to the actual textarea
    useImperativeHandle(ref, () => textareaRef.current!, [])


    // Handle text changes and mention detection
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPosition = e.target.selectionStart || 0
      
      // Call original onChange
      if (onChange) {
        onChange(e)
      }

      // Detect mention at cursor
      const mentionInfo = detectMentionAtCursor(newValue, cursorPosition)
      
      if (mentionInfo) {
        setMentionStart(mentionInfo.mentionStart)
        setMentionQuery(mentionInfo.query)
        setShowDropdown(true)
        setSelectedIndex(0)
        
        // Filter items based on query
        const filtered = filterMentionItems(mentionItems, mentionInfo.query)
        setFilteredItems(filtered)
        
        // Calculate dropdown position based on number of items
        setTimeout(() => {
          const itemHeight = 60 // Approximate height per item (including padding, text, etc.)
          const maxItems = 6 // Show max 6 items before scrolling
          const actualItems = Math.min(filtered.length, maxItems)
          const dropdownHeight = actualItems * itemHeight + 10 // +10 for padding/borders
          
          const position = {
            top: -(dropdownHeight + 5), // Position above textarea with calculated height
            left: 0
          }
          
          setDropdownPosition(position)
        }, 0)
      } else {
        setShowDropdown(false)
        setMentionQuery('')
        setMentionStart(-1)
      }
    }, [onChange, mentionItems])

    // Handle mention selection
    const handleMentionSelect = useCallback((item: MentionItem) => {
      if (!textareaRef.current || mentionStart === -1) return

      const currentValue = textareaRef.current.value
      const cursorPosition = textareaRef.current.selectionStart || 0
      
      const { newText, newCursorPosition } = replaceMentionInText(
        currentValue,
        mentionStart,
        cursorPosition,
        item
      )

      // Update textarea value and cursor position
      textareaRef.current.value = newText
      textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      
      // Create synthetic change event to notify parent
      const syntheticEvent = {
        target: textareaRef.current,
        currentTarget: textareaRef.current
      } as React.ChangeEvent<HTMLTextAreaElement>
      
      if (onChange) {
        onChange(syntheticEvent)
      }

      // Close dropdown
      setShowDropdown(false)
      setMentionQuery('')
      setMentionStart(-1)
      
      // Focus back to textarea
      textareaRef.current.focus()
    }, [mentionStart, onChange])

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    return (
      <Box position="relative">
        <AutosizeTextarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          {...props}
        />
        
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