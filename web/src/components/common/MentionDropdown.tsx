import React from 'react'
import { 
  Box, 
  VStack, 
  Text, 
  useColorModeValue 
} from '@chakra-ui/react'
import { MentionItem } from '../../helpers/mentionUtils'

export interface MentionDropdownProps {
  items: MentionItem[]
  selectedIndex: number
  onSelect: (item: MentionItem) => void
  onClose: () => void
  position: { top: number; left: number }
  visible: boolean
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  items,
  selectedIndex,
  onSelect,
  position,
  visible
}) => {
  console.log('[MentionDropdown] Render:', { visible, itemCount: items.length, position, selectedIndex })
  
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBgColor = useColorModeValue('minusxGreen.50', 'minusxGreen.900')
  const selectedBgColor = useColorModeValue('minusxGreen.100', 'minusxGreen.800')

  if (!visible || items.length === 0) {
    console.log('[MentionDropdown] Not rendering - visible:', visible, 'items:', items.length)
    return null
  }

  console.log('[MentionDropdown] Rendering dropdown with styles:', { 
    top: `${position.top}px`, 
    left: `${position.left}px`,
    zIndex: 1000 
  })

  return (
    <Box
      position="absolute"
      top={`${position.top}px`}
      left={`${position.left}px`}
      zIndex={1000}
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="lg"
      maxHeight="200px"
      overflowY="auto"
      minWidth="200px"
      role="listbox"
      aria-label="Mention suggestions"
    >
      <VStack spacing={0} align="stretch">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex
          const typeColor = item.type === 'table' ? 'blue.500' : 'purple.500'
          
          return (
            <Box
              key={`${item.type}-${item.id}`}
              px={3}
              py={2}
              bg={isSelected ? selectedBgColor : 'transparent'}
              _hover={{ bg: hoverBgColor }}
              cursor="pointer"
              borderRadius="sm"
              onClick={() => onSelect(item)}
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
            >
              <Text fontWeight="medium" fontSize="sm" color="gray.900">
                @{item.name}
              </Text>
              <Text fontSize="xs" color={typeColor} textTransform="uppercase">
                {item.type}
              </Text>
              {item.description && (
                <Text fontSize="xs" color="gray.600" noOfLines={1} mt={1}>
                  {item.description}
                </Text>
              )}
            </Box>
          )
        })}
      </VStack>
      
      {items.length === 0 && (
        <Box px={3} py={2}>
          <Text fontSize="sm" color="gray.500">
            No matching tables or models found
          </Text>
        </Box>
      )}
    </Box>
  )
}