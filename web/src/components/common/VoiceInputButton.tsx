import { IconButton, HStack, Icon, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { BsMic, BsMicMuteFill } from "react-icons/bs";
import { configs } from '../../constants';

export function VoiceInputButton({ disabled, onClick, isRecording }: { disabled: boolean, onClick: () => void, isRecording: boolean }) {

  const icon = isRecording ? BsMicMuteFill: BsMic;
  const variant = isRecording ? 'solid' : 'ghost';
  const labelMessage = isRecording ? 'Stop recording' : 'Type using voice';
  const comingSoon = !configs.VOICE_ENABLED ? ' (Coming Soon!)' : ''
  const label = `${labelMessage}${comingSoon}`;

  let button = (
    <Tooltip hasArrow label={label} placement='right' borderRadius={5} openDelay={500}>
      <IconButton
      isRound={true}
      onClick={onClick}
      aria-label='Voice Input'
      isDisabled={disabled || !configs.VOICE_ENABLED}
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
