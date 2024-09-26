import React from 'react'
import { Tag, TagLabel, TagLeftIcon, Tooltip } from '@chakra-ui/react'
import { IoDiamondOutline } from "react-icons/io5";

export default function CreditsPill({ credits }: { credits: number }) {
  const labelText = `Every time you send a message, you use up credits. 
  Subscribing grants you a fixed amount of credits every day.`
  return (
    // make this clickable and add tooltip
    <Tooltip hasArrow label={labelText} placement='auto' borderRadius={5} openDelay={500}>
      <Tag
        borderRadius='full'
        variant='solid'
        colorScheme="minusxGreen"
        size="lg"
      >
        <TagLeftIcon as={IoDiamondOutline} />
        <TagLabel>{credits}</TagLabel>
      </Tag>
    </Tooltip>
  )
}