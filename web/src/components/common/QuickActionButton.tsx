import React from 'react'
import {
  Icon,
  IconButton,
  Tooltip,
} from '@chakra-ui/react'

export const QuickActionButton = ({tooltip, onclickFn, icon, isDisabled}:
  {tooltip: string, onclickFn: any, icon: React.ElementType, isDisabled: boolean}) => {
  return (

  <Tooltip hasArrow label={tooltip} placement='right' borderRadius={5} openDelay={500}>
    <IconButton
      variant={'ghost'}
      colorScheme="minusxGreen"
      aria-label="Selection"
      size={'sm'}
      onClick={onclickFn}
      icon={<Icon as={icon} boxSize={5} />}
      isDisabled={isDisabled}
      _disabled={{
        _hover: {
          bg: '#eee',
          color: 'minusxBW.500',
          cursor: 'not-allowed',
        },
        bg: 'transparent',
        color: 'minusxBW.500',
      }}
    />
  </Tooltip>
  )
}