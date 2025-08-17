import {
  HStack,
  Stack,
  Checkbox,
  Text
} from '@chakra-ui/react'
import React, { forwardRef, useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import RunTaskButton from './RunTaskButton'
import AbortTaskButton from './AbortTaskButton'
import AutosizeTextarea from './AutosizeTextarea'
import { abortPlan } from '../../state/chat/reducer'
import { setInstructions as setTaskInstructions } from '../../state/thumbnails/reducer'
import { setConfirmChanges } from '../../state/settings/reducer'
import { configs } from '../../constants'
import _ from 'lodash'
import { MetabaseContext } from 'apps/types'
import { getApp } from '../../helpers/app'

interface ChatInputAreaProps {
  isRecording: boolean
  runTask: (instructions: string) => void
  appEnabledStatus: {
    inputBox: boolean
    alert: {
      type: string | null
    }
  }
}

const app = getApp()
const useAppStore = app.useStore()

const ChatInputArea = forwardRef<HTMLTextAreaElement, ChatInputAreaProps>(
  ({ isRecording, runTask, appEnabledStatus }, ref) => {
    const dispatch = useDispatch()
    const reduxInstructions = useSelector((state: RootState) => state.thumbnails.instructions)
    const activeThread = useSelector((state: RootState) => state.chat.threads[state.chat.activeThread])
    const confirmChanges = useSelector((state: RootState) => state.settings.confirmChanges)
    const taskInProgress = !(activeThread.status == 'FINISHED')
    const [instructions, setInstructions] = useState<string>(reduxInstructions)

    // Tool context access for SQL page
    const toolContext: MetabaseContext = useAppStore((state) => state.toolContext)
    const updateConfirmChanges = (value: boolean) => {
      dispatch(setConfirmChanges(value))
    }

    // Sync with redux instructions when they change
    useEffect(() => {
      setInstructions(reduxInstructions)
    }, [reduxInstructions])

    // Debounced update to redux
    const debouncedSetInstruction = useCallback(
      _.debounce((instructions) => dispatch(setTaskInstructions(instructions)), 500),
      [dispatch]
    )

    useEffect(() => {
      debouncedSetInstruction(instructions)
      return () => debouncedSetInstruction.cancel()
    }, [instructions, debouncedSetInstruction])

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        runTask(instructions)
      }
    }

    return (
      <>
        {appEnabledStatus.inputBox && (
          <Stack aria-label="chat-input-area" position={"relative"}>
            <AutosizeTextarea
              ref={ref}
              autoFocus
              aria-label='chat-input'
              value={instructions}
              isDisabled={taskInProgress || isRecording}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={onKeyDown}
              style={{ width: '100%', height: "100%" }}
            />
            <HStack aria-label="chat-controls" position={"absolute"} bottom={0} width={"100%"} p={2}>
              <HStack justify={"space-between"} width={"100%"}>
                <HStack gap={0}>
                  {(toolContext.pageType === 'sql') && (
                    <Checkbox 
                      sx={{
                        '& input:not(:checked) + span': {
                          borderColor: 'minusxBW.500',
                        },
                        '& input:checked + span': {
                          bg: 'minusxGreen.500',
                          borderColor: 'minusxGreen.500',
                        },
                        '& input:checked:hover + span': {
                          bg: 'minusxGreen.500',
                          borderColor: 'minusxGreen.500',
                        },
                        span: {
                          marginLeft: 1,
                        }
                      }}
                      isChecked={confirmChanges}
                      onChange={(e) => updateConfirmChanges(e.target.checked)}
                    >
                      <Text fontSize="xs">Review SQL Edits</Text>
                    </Checkbox>
                  )}
                </HStack>
                <HStack>
                  {taskInProgress ? (
                    <AbortTaskButton abortTask={() => dispatch(abortPlan())} disabled={!taskInProgress}/>
                  ) : (
                    <RunTaskButton runTask={() => runTask(instructions)} disabled={taskInProgress} />
                  )}
                </HStack>
              </HStack>
            </HStack>
          </Stack>
        )}
      </>
    )
  }
)

ChatInputArea.displayName = 'ChatInputArea'

export default ChatInputArea