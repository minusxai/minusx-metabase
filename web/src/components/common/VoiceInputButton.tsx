import { IconButton, HStack, Icon, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { BsMic, BsMicMuteFill } from "react-icons/bs";

export function VoiceInputButton({ disabled, onClick, isRecording }: { disabled: boolean, onClick: () => void, isRecording: boolean }) {

  const icon = isRecording ? BsMicMuteFill: BsMic;

  let button = (
    <Tooltip hasArrow label="Stop" placement='left' borderRadius={5} openDelay={500}>
      <IconButton
      isRound={true}
      onClick={onClick}
      variant='solid'
      colorScheme='minusxGreen'
      aria-label='Voice Input'
      size={"sm"}
      icon={<Icon as={icon} boxSize={5} />}
      disabled={disabled}
      />
    </Tooltip>
  );

  return <HStack alignItems="center">{button}</HStack>;
}
