import React from 'react'
import { Tag, TagLabel, TagLeftIcon, Tooltip } from '@chakra-ui/react'
import { IoDiamondOutline } from "react-icons/io5";

export default function CreditsPill({ credits }: { credits: number }) {
  const labelText = `Daily credits. You use credits every time you send a message. 
  Upgrading increases the amount of credits every day.`
  return (
    <Tooltip hasArrow label={labelText} placement='auto' borderRadius={5} openDelay={500}>
      <Tag
        borderRadius='3'
        variant='solid'
        colorScheme="minusxBW"
        size="sm"
      >
        <TagLeftIcon color={"minusxBW.800"} as={IoDiamondOutline} />
        <TagLabel color={"minusxBW.800"}>{credits}</TagLabel>
      </Tag>
    </Tooltip>
  )
}