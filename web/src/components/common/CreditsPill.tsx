import React, { useState } from 'react'
import { Tag, TagLabel, TagLeftIcon, TagRightIcon, Tooltip } from '@chakra-ui/react'
import { IoDiamondOutline, IoReload } from "react-icons/io5";

const asyncFn = async () => {}

export default function CreditsPill({ credits, onReload }: { credits: number, onReload: typeof asyncFn }) {
  const labelText = `Weekly credits. You use credits every time you send a message. 
  Upgrading increases the amount of credits every week.`
  const [isLoading, setIsLoading] = useState(false)
  const reloadCredits = async () => {
    setIsLoading(true)
    await onReload()
    setIsLoading(false)
  }
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
        <TagRightIcon
          _hover={{
            color: isLoading ? 'gray.400' : 'minusxBW.900',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          color={isLoading ? 'gray.400' : 'minusxBW.800'}
          as={IoReload}
          onClick={isLoading ? undefined : reloadCredits}
          style={{
            animation: isLoading ? 'spin 1s linear infinite' : undefined,
          }}
          />
      </Tag>
    </Tooltip>
  )
}