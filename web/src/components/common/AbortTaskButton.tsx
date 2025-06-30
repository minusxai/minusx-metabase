import { IconButton, HStack, Icon, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { BsStopFill } from 'react-icons/bs';

export default function AbortTaskButton({ abortTask, disabled }: { abortTask: () => void, disabled: boolean}) {

  let button = (
    <Tooltip hasArrow label="Stop" placement='left' borderRadius={5} openDelay={500}>
      <IconButton
      isRound={true}
      onClick={abortTask}
      variant='solid'
      colorScheme='minusxGreen'
      aria-label='abort-button'
      size={"sm"}
      icon={<Icon as={BsStopFill} boxSize={5} />}
      disabled={disabled}
      />
    </Tooltip>
  );

  return <HStack alignItems="center">{button}</HStack>;
}
