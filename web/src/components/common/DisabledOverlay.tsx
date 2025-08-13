import React from 'react'
import { useSelector } from 'react-redux'
import {
  Icon,
  Box,
  Flex
} from '@chakra-ui/react'
import { getParsedIframeInfo } from '../../helpers/origin'
import { RootState } from '../../state/store'
import { Markdown } from './Markdown'
import { BsFillLightningFill } from 'react-icons/bs'


export function DisabledOverlay({ toolEnabledReason, local = false }: { toolEnabledReason: string, local?: boolean }) {
  const isDevToolsOpen = useSelector((state: RootState) => state.settings.isDevToolsOpen)
  const width = getParsedIframeInfo().width

  
  return (
    <Box
      position="absolute"
      top={0}
      right={local ? undefined : 0}
      left={local ? 0 : undefined}
      width={local ? "100%" : (isDevToolsOpen ? '850px' : `${width}px`)}
      height="100%"
      bg="rgba(255, 255, 255, 0.5)"
      backdropFilter="blur(4px)"
      zIndex={1000}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Flex
        direction="column"
        align="center"
        justify="center"
        bg="white"
        borderRadius="xl"
        boxShadow="2xl"
        p={8}
        mx={6}
        maxWidth="400px"
        border="1px solid"
        borderColor="gray.200"
        transform="scale(1)"
        transition="all 0.2s ease-in-out"
        _hover={{
          transform: 'scale(1.02)',
          boxShadow: '3xl'
        }}
      >
        <Box
          width="60px"
          height="60px"
          borderRadius="full"
          bg="minusxGreen.100"
          display="flex"
          alignItems="center"
          justifyContent="center"
          mb={4}
        >
          <Icon as={BsFillLightningFill} boxSize={6} color="white" />
        </Box>
        
        <Box
          fontSize="md"
          fontWeight="medium"
          color="gray.700"
          textAlign="center"
          lineHeight="1.6"
        >
          <Markdown content={toolEnabledReason} />
        </Box>
      </Flex>
    </Box>
  )
}