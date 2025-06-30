import { IconButton, HStack, Icon, Tooltip } from '@chakra-ui/react';
import React from 'react';
import { BsPlayFill, BsStopFill } from 'react-icons/bs';

export default function RunTaskButton({ runTask, disabled }: { runTask: () => void, disabled: boolean}) {

  let button = (
    <Tooltip hasArrow label="Run" placement='left' borderRadius={5} openDelay={500}>
      <IconButton
        isRound={true}
        onClick={runTask}
        variant='solid'
        colorScheme='minusxGreen'
        aria-label='run-button'
        size={"sm"}
        icon={<Icon as={BsPlayFill} boxSize={5} />}
        disabled={disabled}
      />
    </Tooltip>
  );

  return <HStack alignItems="center">{button}</HStack>;
}
