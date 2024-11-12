import { IconButton, HStack, Icon, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { BsMic, BsMicMuteFill } from "react-icons/bs";

export function VoiceInputButton({ disabled, onClick, isRecording }: { disabled: boolean, onClick: () => void, isRecording: boolean }) {

  const icon = isRecording ? BsMicMuteFill: BsMic;
  const variant = isRecording ? 'solid' : 'ghost';

  let button = (
    <Tooltip hasArrow label="Stop" placement='left' borderRadius={5} openDelay={500}>
      <IconButton
      isRound={true}
      onClick={onClick}
      aria-label='Voice Input'
      disabled={disabled}
      variant={variant}
      colorScheme='minusxGreen'
      size={'sm'}
      icon={<Icon as={icon} boxSize={5} />}
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
  );

  return <HStack alignItems="center">{button}</HStack>;
}
