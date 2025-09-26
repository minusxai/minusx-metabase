import React from 'react'
import { 
  Box, 
  VStack, 
  Text, 
  useColorModeValue, 
  Badge
} from '@chakra-ui/react'
import { MentionItem } from '../../helpers/mentionUtils'

export interface MentionDropdownProps {
  items: MentionItem[]
  selectedIndex: number
  onSelect: (item: MentionItem) => void
  onClose: () => void
  position: { top?: number; bottom?: number; left: number }
  visible: boolean
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
  items,
  selectedIndex,
  onSelect,
  position,
  visible
}) => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBgColor = useColorModeValue('minusxGreen.600', 'minusxGreen.600')
  const selectedBgColor = useColorModeValue('minusxGreen.600', 'minusxGreen.600')
  const hoverTextColor = useColorModeValue('white', 'white')

  if (!visible || items.length === 0) {
    return null
  }

  return (
    <Box
      position="absolute"
      bottom={position.bottom ? `${position.bottom}px` : undefined}
      top={position.top ? `${position.top}px` : undefined}
      left={`${position.left}px`}
      zIndex={1000}
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      boxShadow="lg"
      maxHeight="360px"
      overflowY="auto"
      minWidth="200px"
      role="listbox"
      aria-label="Mention suggestions"
      w={"100%"}
    >
      <VStack spacing={0} align="stretch">
        {items.map((item, index) => {
          const isSelected = index === selectedIndex
          const typeColor = item.type === 'table' ? 'red.500' : 'blue.500'
          
          return (
            <Box
              key={`${item.type}-${item.id}`}
              px={3}
              py={2}
              bg={isSelected ? selectedBgColor : 'transparent'}
              color={isSelected ? hoverTextColor : 'inherit'}
              _hover={{ bg: hoverBgColor, color: hoverTextColor }}
              cursor="pointer"
              borderRadius="sm"
              borderBottom="1px solid #eee"
              onClick={() => onSelect(item)}
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
            >
              <Text fontWeight="medium" fontSize="sm">
                @{item.name}
              </Text>
              <Text fontSize="xs" textTransform="uppercase">
                <Badge mr={1} color={typeColor}>{item.type}</Badge>
                {(item.schema || item.collection) && <Badge color={"#333"}>{item.type === 'table' ? `Schema: ${item.schema}` : `Collection: ${item.collection}`}</Badge>}
              </Text>
              {item.description && (
                <Text fontSize="xs" noOfLines={1} mt={1}>
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