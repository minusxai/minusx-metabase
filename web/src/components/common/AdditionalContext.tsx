import { Checkbox, Button, Input, VStack, Text, Link, HStack, Box, Divider, AbsoluteCenter, Stack, Switch, Textarea, Radio, RadioGroup, IconButton, Icon, Tag, TagLabel } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { dispatch, logoutState, resetState } from '../../state/dispatch';
import { setAiRules } from '../../state/settings/reducer';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { toast } from '../../app/toast';
import { SettingsBlock } from './SettingsBlock';

const AdditionalContext = () => {
  const aiRules = useSelector((state: RootState) => state.settings.aiRules)
  const [customInstructions, setCustomInstructions] = useState(aiRules)
  const handleSave = () => {
    dispatch(setAiRules(customInstructions))
    toast({
      title: 'Custom Instructions Saved!',
      description: "These instructions will be used from the next query onwards.",
      status: 'success',
      duration: 3000,
      isClosable: true,
      position: 'bottom-right',
    })
  }
  const handleReset = () => {
    setCustomInstructions(aiRules)
  }

  return (
    <VStack className='settings-body'
    justifyContent="start"
    alignItems="stretch"
    flex={1}
    height={'80vh'}
    width={"100%"}
    overflow={"scroll"}
    pt={2}
    >
      <SettingsBlock title="More Context" >
        <VStack pt={3}>
          <VStack alignItems={"start"} gap={1}>
            <Text color={"minusxBW.800"} fontSize="sm" fontWeight={"bold"}>Custom Instructions</Text>
            <Text color={"minusxBW.600"} fontSize="xs">Custom instructions allow you to share anything you'd like MinusX to consider while thinking.
            The instructions are specific to the app you're using (Metabase, Sheets, etc.).</Text>
            <Textarea
              marginTop={2}
              value={customInstructions}
              // onChange={(e) => dispatch(setAiRules(e.target.value))}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder={`Examples:\n1. Only use tables from "public" schema\n2. Always use plotly for plotting`}
              size="sm"
              _focus={{
                border: '1.5px solid #16a085',
                boxShadow: 'none',
                bg: "#fefefe"
              }}
              border='1px solid #aaa'
              borderRadius='lg'
              minHeight={150}
              bg={"#eee"}
            />
            <HStack justify={"space-between"} width={"100%"} alignItems={"center"} pt={2}>
              <HStack spacing={2}>
                <Button size="sm" colorScheme="minusxGreen" onClick={handleSave} isDisabled={aiRules === customInstructions}>Save</Button>
                <Button size="sm" colorScheme="minusxGreen" onClick={handleReset} isDisabled={aiRules === customInstructions}>Reset</Button>
              </HStack>
              {aiRules != customInstructions ? <Text color={"minusxBW.600"} fontSize="xs">unsaved changes</Text> : null}
            </HStack>
          </VStack>
        </VStack>
      </SettingsBlock>
    </VStack>
  );
};

export default AdditionalContext;
