import React from 'react'
import { Tag, TagLabel, TagLeftIcon, Tooltip } from '@chakra-ui/react'
import { IoDiamondOutline } from "react-icons/io5";

export default function CreditsPill({ credits }: { credits: number }) {
  const labelText = `Daily credits. You use credits every time you send a message. 
  Upgrading increases the amount of credits every day.`
  return (
    // make this clickable and add tooltip
    <Tooltip hasArrow label={labelText} placement='auto' borderRadius={5} openDelay={500}>
      <Tag
        borderRadius='3'
        variant='outline'
        colorScheme="minusxGreen"
        size="sm"
      >
        <TagLeftIcon as={IoDiamondOutline} />
        <TagLabel>{credits}</TagLabel>
      </Tag>
    </Tooltip>
  )
}