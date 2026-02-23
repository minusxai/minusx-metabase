import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { TextareaProps, Box } from '@chakra-ui/react'
import AutosizeTextarea from './AutosizeTextarea'
import { MentionDropdown } from './MentionDropdown'
import {
  MentionItem,
  detectMentionAtCursor,
  filterMentionItems,
  replaceMentionInText,
} from '../../helpers/mentionUtils'
import { debounce } from 'lodash'

interface MentionTextareaProps extends Omit<TextareaProps, 'onChange'> {
  mentionItems: MentionItem[]
  onChange?: (event: { target: { value: string } }) => void
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ mentionItems, value, onChange, onKeyDown, placeholder, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [filteredItems, setFilteredItems] = useState<MentionItem[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [mentionStart, setMentionStart] = useState(-1)

    // Rotating placeholder
    const [placeholderIndex, setPlaceholderIndex] = useState(0)
    const placeholders = ['Ask anything!', 'Tip: Use @ to mention any tables or models']

    useEffect(() => {
      const interval = setInterval(() => {
        setPlaceholderIndex(prev => (prev + 1) % placeholders.length)
      }, 5000)
      return () => clearInterval(interval)
    }, [])

    const currentPlaceholder = placeholder || placeholders[placeholderIndex]

    useImperativeHandle(ref, () => textareaRef.current!, [])

    const debouncedSearch = useMemo(
      () => debounce((query: string) => {
        setFilteredItems(filterMentionItems(mentionItems, query))
      }, 150),
      [mentionItems]
    )

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      // selectionStart is always exact — no custom cursor position logic needed
      const cursorPosition = e.target.selectionStart ?? newValue.length

      if (onChange) {
        onChange({ target: { value: newValue } })
      }

      const mentionInfo = detectMentionAtCursor(newValue, cursorPosition)
      if (mentionInfo) {
        setMentionStart(mentionInfo.mentionStart)
        setShowDropdown(true)
        setSelectedIndex(0)
        debouncedSearch(mentionInfo.query)
      } else {
        setShowDropdown(false)
        setMentionStart(-1)
        debouncedSearch.cancel()
      }
    }, [onChange, debouncedSearch])

    const handleMentionSelect = useCallback((item: MentionItem) => {
      if (!textareaRef.current || mentionStart === -1) return

      const currentValue = String(value || '')
      const cursorPosition = textareaRef.current.selectionStart ?? currentValue.length

      const { newText, newCursorPosition } = replaceMentionInText(
        currentValue, mentionStart, cursorPosition, item
      )

      if (onChange) {
        onChange({ target: { value: newText } })
      }

      // Restore cursor after React re-renders the controlled value
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition)
        textareaRef.current?.focus()
      }, 0)

      setShowDropdown(false)
      setMentionStart(-1)
    }, [value, mentionStart, onChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showDropdown && filteredItems.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setSelectedIndex(prev => (prev + 1) % filteredItems.length)
            return
          case 'ArrowUp':
            e.preventDefault()
            setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length)
            return
          case 'Enter':
            if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
              e.preventDefault()
              handleMentionSelect(filteredItems[selectedIndex])
              return
            }
            break
          case 'Tab':
            if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
              e.preventDefault()
              handleMentionSelect(filteredItems[selectedIndex])
              return
            }
            break
          case 'Escape':
            e.preventDefault()
            setShowDropdown(false)
            return
        }
      }
      if (onKeyDown) onKeyDown(e)
    }, [showDropdown, filteredItems, selectedIndex, handleMentionSelect, onKeyDown])

    useEffect(() => {
      return () => debouncedSearch.cancel()
    }, [debouncedSearch])

    useEffect(() => {
      const handleClickOutside = () => setShowDropdown(false)
      if (showDropdown) {
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
      }
    }, [showDropdown])

    return (
      <Box position="relative">
        <AutosizeTextarea
          ref={textareaRef}
          value={String(value || '')}
          onChange={handleChange as any}
          onKeyDown={handleKeyDown as any}
          placeholder={currentPlaceholder}
          {...props}
        />
        <MentionDropdown
          items={filteredItems}
          selectedIndex={selectedIndex}
          onSelect={handleMentionSelect}
          onClose={() => setShowDropdown(false)}
          position={{ bottom: 100, left: 0 }}
          visible={showDropdown}
        />
      </Box>
    )
  }
)

MentionTextarea.displayName = 'MentionTextarea'
