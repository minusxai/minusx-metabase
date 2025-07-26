import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import {
    BiSolidCheckCircle,
    BiSolidErrorCircle,
} from 'react-icons/bi';
import { BiCircle } from 'react-icons/bi';
import { MdBlock } from 'react-icons/md';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import { BsFillHandThumbsUpFill, BsFillHandThumbsDownFill } from 'react-icons/bs';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { Task, Tasks as TasksInfo } from '../../state/chat/reducer';
import { get, last } from 'lodash';
import { getActionTaskLiteLabels } from '../../helpers/utils';
import { useSubmitMessageFeedbackMutation } from '../../app/api/userStateApi';

interface TaskWithLevel extends Task {
  level: number;
}

interface TimelineNodeProps {
  task: TaskWithLevel;
  isLast: boolean;
  parentLevels: boolean[];
  taskInterrupted?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  hasChildren?: boolean;
}

const TimelineNode: React.FC<TimelineNodeProps> = ({
    task,
    isLast,
    parentLevels,
    taskInterrupted = false,
    isExpanded = true,
    onToggleExpand,
    hasChildren = false
}) => {
  const getStatusIcon = () => {
    if (taskInterrupted) {
      return <Icon as={MdBlock} color="orange.500" title="Interrupted" />;
    }
    if (task.result != null) {
        const isError = (typeof task.result === 'object' && task.result !== null && (task.result as any).error);
        if (isError) {
            return <Icon as={BiSolidErrorCircle} color="red.500" title="Failed" />;
        }
        return <Icon as={BiSolidCheckCircle} color="green.500" title="Completed" />;
    } else {
        if ((task as any).status === 'running') {
             return <Spinner size="xs" speed="0.8s" thickness="2px" color="blue.500" title="Running" />;
        }
        return <Icon as={BiCircle} color="gray.500" title="Pending" />;
    }
  };

  const indentSize = 20;
  const level = task.level;

  return (
    <HStack
      spacing={0}
      w="100%"
      py={1}
      position="relative"
      alignItems="center"
    >
      {/* Tree structure lines */}
      {Array.from({ length: level }).map((_, i) => (
        <Box key={i} position="relative" width={`${indentSize}px`} height="20px">
          {/* Vertical line for parent levels */}
          {parentLevels[i] && (
            <Box
              position="absolute"
              left="9px"
              top="0"
              bottom="0"
              width="1px"
              bg="minusxBW.500"
            />
          )}
          
          {/* Connector lines for current level */}
          {i === level - 1 && (
            <>
              {/* Vertical line */}
              <Box
                position="absolute"
                left="9px"
                top="0"
                height={isLast ? "10px" : "100%"}
                width="1px"
                bg="minusxBW.500"
              />
              {/* Horizontal line */}
              <Box
                position="absolute"
                left="9px"
                top="9px"
                width="10px"
                height="1px"
                bg="minusxBW.500"
              />
            </>
          )}
        </Box>
      ))}
      
      {/* Expand/collapse icon for root tasks with children */}
      {task.level === 0 && hasChildren && (
        <Box 
          flexShrink={0} 
          display="flex" 
          alignItems="center" 
          w="16px" 
          justifyContent="center" 
          mr={1}
          cursor="pointer"
          onClick={onToggleExpand}
          _hover={{ bg: 'minusxBW.400' }}
          borderRadius={2}
          p={0.5}
        >
          <Icon 
            as={isExpanded ? IoChevronDown : IoChevronForward} 
            color="minusxBW.600"
            boxSize={3}
          />
        </Box>
      )}
      
      {/* Status icon */}
      <Box flexShrink={0} display="flex" alignItems="center" w="20px" justifyContent="center" mr={2}>
        {getStatusIcon()}
      </Box>

      {/* Task name */}
      <Text 
        fontSize="sm" 
        noOfLines={1} 
        flexGrow={1} 
        title={task.agent}
        cursor={task.level === 0 && hasChildren ? "pointer" : "default"}
        onClick={task.level === 0 && hasChildren ? onToggleExpand : undefined}
      >
        {getActionTaskLiteLabels(task.agent)}
      </Text>
    </HStack>
  );
};

interface FlattenedTask {
  task: TaskWithLevel;
  isLast: boolean;
  parentLevels: boolean[];
}

const flattenTasks = (tasks: TasksInfo, expandedRootTasks: Set<string> = new Set()): FlattenedTask[] => {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const result: FlattenedTask[] = [];
  
  const addTaskAndChildren = (task: Task, level: number = 0, parentLevels: boolean[] = [], isLastAtLevel: boolean = false, rootTaskId?: string) => {
    const taskWithLevel: TaskWithLevel = { ...task, level };
    
    result.push({
      task: taskWithLevel,
      isLast: isLastAtLevel,
      parentLevels: [...parentLevels]
    });
    
    // Only show children if the root task is expanded (or if we're already in a subtree of an expanded root)
    const currentRootId = rootTaskId || task.id;
    const shouldShowChildren = level === 0 ? expandedRootTasks.has(currentRootId) : expandedRootTasks.has(rootTaskId!);
    
    if (shouldShowChildren && Array.isArray(task.child_ids) && task.child_ids.length > 0) {
      const childTasks = task.child_ids
        .map(childId => taskMap.get(childId))
        .filter((child): child is Task => child !== undefined);
      
      const newParentLevels = [...parentLevels, !isLastAtLevel];
      
      childTasks.forEach((childTask, index) => {
        const isLastChild = index === childTasks.length - 1;
        addTaskAndChildren(childTask, level + 1, newParentLevels, isLastChild, currentRootId);
      });
    }
  };

  // Find root tasks (tasks without parents or whose parents don't exist)
  const childIds = new Set<string>();
  tasks.forEach(task => {
    if (Array.isArray(task.child_ids)) {
      task.child_ids.forEach(cid => childIds.add(cid));
    }
  });

  const rootTasks = tasks.filter(task =>
    !childIds.has(task.id) && (!task.parent_id || !taskMap.has(task.parent_id))
  );

  rootTasks.forEach((rootTask, index) => {
    const isLastRoot = index === rootTasks.length - 1;
    addTaskAndChildren(rootTask, 0, [], isLastRoot, rootTask.id);
  });
  
  return result;
};

export const TasksLite: React.FC = () => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [negativeText, setNegativeText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const thread = useSelector((state: RootState) => state.chat.activeThread);
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread]);
  const taskInProgress = !(activeThread.status === 'FINISHED')
  const taskInterrupted = activeThread.interrupted
  
  const [submitMessageFeedback] = useSubmitMessageFeedbackMutation();
  
  const [expandedRootTasks, setExpandedRootTasks] = useState<Set<string>>(new Set());

  const allTasks: TasksInfo = activeThread?.tasks || [];
  const flatTasks = useMemo(() => flattenTasks(allTasks, expandedRootTasks), [allTasks, expandedRootTasks]);
  
  const rootTasks = useMemo(() => {
    if (!allTasks || allTasks.length === 0) return [];
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const childIds = new Set<string>();
    allTasks.forEach(task => {
        if (Array.isArray(task.child_ids)) {
            task.child_ids.forEach(cid => childIds.add(cid));
        }
    });
    return allTasks.filter(task =>
        !childIds.has(task.id) && (!task.parent_id || !taskMap.has(task.parent_id))
    );
  }, [allTasks]);
  
  const toggleRootTask = (taskId: string) => {
    setExpandedRootTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };
  
  const isEmpty = allTasks.length === 0;
  const isLoading = !isEmpty && rootTasks.length > 0 && !last(rootTasks)?.result;

  const lastMessage = last(activeThread?.messages);
  const lastMessageContent = get(lastMessage, 'content');
  const isStarting = (
      get(lastMessage, 'role') === 'user' ||
      (typeof lastMessageContent === 'string' && lastMessageContent.includes('/start_task'))
    ) && (isEmpty || isLoading);

  const handlePositiveFeedback = () => {
    setFeedback('positive');
    
    // Fire-and-forget API call for positive feedback
    const lastAssistantMessage = activeThread.messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant');
    
    if (lastAssistantMessage) {
      submitMessageFeedback({
        conversation_id: activeThread.id,
        message_index: lastAssistantMessage.index,
        feedback_type: 'positive',
        feedback_text: null
      }).catch(error => {
        console.warn('Failed to submit positive feedback:', error);
      });
    }
  };

  const handleNegativeFeedback = () => {
    setFeedback('negative');
  };

  const handleSubmitNegativeFeedback = () => {
    setFeedbackSubmitted(true);
    
    // Fire-and-forget API call for negative feedback
    const lastAssistantMessage = activeThread.messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant');
    
    if (lastAssistantMessage) {
      submitMessageFeedback({
        conversation_id: activeThread.id,
        message_index: lastAssistantMessage.index,
        feedback_type: 'negative',
        feedback_text: negativeText.trim() || null
      }).catch(error => {
        console.warn('Failed to submit negative feedback:', error);
      });
    }
  };

  const showFeedbackButtons = !isEmpty && !isLoading && !taskInProgress && (feedback === null);

  if (isStarting) {
    return (
      <Box
        bg={'minusxBW.300'}
        p={3}
        borderRadius={5}
        color={'minusxBW.600'}
        width={"100%"}
      >
        <VStack align="stretch" width={"100%"} spacing={2}>
          <HStack justifyContent="space-between" px={1}>
            <HStack>
              <Text fontSize={"sm"} fontWeight={600} color={'minusxBW.700'}>Tasks</Text>
              <Spinner size="xs" speed={'0.75s'} color="minusxBW.600" />
            </HStack>
          </HStack>
          <Text fontSize="sm" color="minusxBW.600" textAlign="center" p={2}>Loading tasks...</Text>
        </VStack>
      </Box>
    );
  }

  if (isEmpty) {
    return (
      <Box
        bg={'minusxBW.300'}
        p={3}
        borderRadius={5}
        color={'minusxBW.600'}
        width={"100%"}
      >
        <VStack align="stretch" width={"100%"} spacing={2}>
          <Text fontSize={"sm"} fontWeight={600} color={'minusxBW.700'}>Tasks</Text>
          <Text fontSize="sm" color="minusxBW.600" textAlign="center" p={2}>No tasks initiated.</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      bg={'minusxBW.300'}
      p={3}
      borderRadius={5}
      color={'minusxBW.600'}
      width={"100%"}
      maxH="45vh"
      overflowY="auto"
      sx={{
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-track': { background: 'minusxBW.400', borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb': { background: 'minusxBW.500', borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'minusxBW.600' },
      }}
    >
      <VStack align="stretch" width={"100%"} spacing={2}>
        <HStack justifyContent="space-between" px={1}>
          <HStack>
            <Text fontSize={"sm"} fontWeight={600} color={'minusxBW.700'}>Tasks</Text>
            {isLoading && taskInProgress && <Spinner size="xs" speed={'0.75s'} color="minusxBW.600" />}
          </HStack>
        </HStack>

        <Box background={'minusxBW.200'} borderRadius={5} p={2}>
          <VStack align="stretch" spacing={0} w="100%">
            {flatTasks.map((flatTask, index) => {
              const hasChildren = Array.isArray(flatTask.task.child_ids) && flatTask.task.child_ids.length > 0;
              const isExpanded = expandedRootTasks.has(flatTask.task.id);
              
              return (
                <TimelineNode
                  key={`${flatTask.task.id}-${index}`}
                  task={flatTask.task}
                  isLast={flatTask.isLast}
                  parentLevels={flatTask.parentLevels}
                  taskInterrupted={taskInterrupted}
                  hasChildren={hasChildren}
                  isExpanded={isExpanded}
                  onToggleExpand={() => toggleRootTask(flatTask.task.id)}
                />
              );
            })}
          </VStack>
        </Box>

        {showFeedbackButtons && (
          <VStack spacing={1} pt={2}>
            <Text fontSize="11" color="minusxBW.600" textAlign="center">
              Were you satisfied with this answer? Feedback helps the agent improve and better adapt to you!
            </Text>
            <HStack justifyContent="center" spacing={2} w={"100%"}>
              <IconButton
                aria-label="Thumbs up"
                icon={<BsFillHandThumbsUpFill />}
                size="xs"
                width="25%"
                height="24px"
                variant='outline'
                onClick={handlePositiveFeedback}
              />
              <IconButton
                aria-label="Thumbs down"
                icon={<BsFillHandThumbsDownFill />}
                size="xs"
                width="25%"
                height="24px"
                variant='outline'
                onClick={handleNegativeFeedback}
                color='red.400'
                borderColor={'red.400'}
                _hover={{ bg: 'red.400', color: 'white' }}
              />
            </HStack>
          </VStack>
        )}

        {feedback === 'negative' && !feedbackSubmitted && (
          <VStack spacing={2} pt={2}>
            <Textarea
              placeholder="Please tell us what went wrong..."
              value={negativeText}
              onChange={(e) => setNegativeText(e.target.value)}
              size="xs"
              resize="vertical"
              minH="60px"
              bg="minusxBW.200"
              border="1px solid"
              borderColor="minusxBW.500"
              borderRadius={5}
              _focus={{ borderColor: "minusxBW.700" }}
            />
            <Button
              size="xs"
              colorScheme="minusxGreen"
              onClick={handleSubmitNegativeFeedback}
              isDisabled={!negativeText.trim()}
            >
              Submit Feedback
            </Button>
          </VStack>
        )}

        {((feedback == 'positive') || (feedbackSubmitted)) && (
          <VStack spacing={1} pt={2}>
            <Text fontSize="xs" color="minusxBW.600" textAlign="center" fontWeight="500">
              Thanks for the feedback!
            </Text>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};