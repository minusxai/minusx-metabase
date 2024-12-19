import React from 'react';
import { VStack, Box, Divider, AbsoluteCenter } from '@chakra-ui/react';

const SettingsHeader = ({ text }: { text: string }) => (
  <Box position='relative' marginTop={2}>
    <Divider borderColor="minusxGreen.800" />
    <AbsoluteCenter bg='minusxBW.300' px='4' color="minusxGreen.800">
      {text}
    </AbsoluteCenter>
  </Box>
)

export const SettingsBlock = ({title, children}: {title: string, children: React.ReactNode}) => (
  <VStack borderRadius={10} bg="minusxBW.300" alignItems={"stretch"} padding={3}>
    <SettingsHeader text={title} />
    {children}
  </VStack>
)