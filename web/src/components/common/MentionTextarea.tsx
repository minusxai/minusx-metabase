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

    // Calculate cursor position for dropdown
    const getCaretCoordinates = useCallback(() => {
      if (!textareaRef.current) return { top: 0, left: 0 }

      const textArea = textareaRef.current
      const caretOffset = textArea.selectionStart || 0
      
      // Simple fallback positioning - place dropdown below textarea
      const rect = textArea.getBoundingClientRect()
      
      console.log('[getCaretCoordinates] TextArea rect:', rect)
      console.log('[getCaretCoordinates] CaretOffset:', caretOffset)
      
      // For now, use a simple approach - position dropdown at the bottom-left of textarea
      // TODO: Later we can implement proper cursor positioning
      const position = {
        top: rect.height + 5, // Just below the textarea
        left: 0 // Align with textarea left edge
      }
      
      console.log('[getCaretCoordinates] Calculated position:', position)
      return position
    }, [value])

    // Handle text changes and mention detection
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      const cursorPosition = e.target.selectionStart || 0
      
      console.log('[MentionTextarea] Text changed:', { newValue, cursorPosition, mentionItems: mentionItems.length })
      
      // Call original onChange
      if (onChange) {
        onChange(e)
      }

      // Detect mention at cursor
      const mentionInfo = detectMentionAtCursor(newValue, cursorPosition)
      console.log('[MentionTextarea] Mention detection result:', mentionInfo)
      
      if (mentionInfo) {
        console.log('[MentionTextarea] Setting up mention dropdown')
        setMentionStart(mentionInfo.mentionStart)
        setMentionQuery(mentionInfo.query)
        setShowDropdown(true)
        setSelectedIndex(0)
        
        // Filter items based on query
        const filtered = filterMentionItems(mentionItems, mentionInfo.query)
        console.log('[MentionTextarea] Filtered items:', filtered.length, filtered.slice(0, 3).map(i => i.name))
        setFilteredItems(filtered)
        
        // Calculate dropdown position
        setTimeout(() => {
          const position = getCaretCoordinates()
          console.log('[MentionTextarea] Dropdown position:', position)
          setDropdownPosition(position)
        }, 0)
      } else {
        console.log('[MentionTextarea] Hiding dropdown')
        setShowDropdown(false)
        setMentionQuery('')
        setMentionStart(-1)
      }
    }, [onChange, mentionItems, getCaretCoordinates])

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