import {
  HStack,
  Stack,
  Checkbox,
  Text,
  Badge
} from '@chakra-ui/react'
import React, { forwardRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import RunTaskButton from './RunTaskButton'
import AbortTaskButton from './AbortTaskButton'
import { MentionTextarea } from './MentionTextarea'
import { abortPlan } from '../../state/chat/reducer'
import { setInstructions as setTaskInstructions } from '../../state/thumbnails/reducer'
import { setConfirmChanges } from '../../state/settings/reducer'
import { configs } from '../../constants'
import _ from 'lodash'
import { MetabaseContext } from 'apps/types'
import { getApp } from '../../helpers/app'
import { createMentionItems, convertMentionsToStorage } from '../../helpers/mentionUtils'

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

    // Create mention items from tables and models
    const mentionItems = useMemo(() => {
      if (!toolContext.dbInfo) return []
      const tables = toolContext.dbInfo.tables || []
      const models = toolContext.dbInfo.models || []
      return createMentionItems(tables, models)
    }, [toolContext.dbInfo])

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
        // Convert mentions to storage format before sending
        const instructionsWithStorageMentions = convertMentionsToStorage(instructions, mentionItems)
        runTask(instructionsWithStorageMentions)
      }
    }

    return (
      <>
        {appEnabledStatus.inputBox && (
          <Stack aria-label="chat-input-area" position={"relative"}>
            <MentionTextarea
              ref={ref}
              autoFocus
              aria-label='chat-input'
              value={instructions}
              isDisabled={taskInProgress || isRecording}
              onChange={(e) => setInstructions(e.target.value)}
              onKeyDown={onKeyDown}
              style={{ width: '100%', height: "100%" }}
              mentionItems={mentionItems}
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
                      <HStack spacing={1} align="start">
                        <Text fontSize="xs">Review Mode</Text>
                        <Badge size="sm" colorScheme="blue" fontSize="xs">NEW</Badge>
                      </HStack>
                    </Checkbox>
                  )}
                </HStack>
                <HStack>
                  {taskInProgress ? (
                    <AbortTaskButton abortTask={() => dispatch(abortPlan())} disabled={!taskInProgress}/>
                  ) : (
                    <RunTaskButton runTask={() => {
                      const instructionsWithStorageMentions = convertMentionsToStorage(instructions, mentionItems)
                      runTask(instructionsWithStorageMentions)
                    }} disabled={taskInProgress} />
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