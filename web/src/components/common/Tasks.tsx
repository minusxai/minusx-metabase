import React, { useState, useMemo } from 'react';
import {
  Box,
  HStack,
  Icon,
  Spinner,
  Text,
  VStack,
  IconButton,
  Collapse,
  Tooltip,
  Tag,
} from '@chakra-ui/react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  WarningIcon,
  TimeIcon,
  InfoOutlineIcon // Icon for args/results section
} from '@chakra-ui/icons';
import { useSelector } from 'react-redux';
// Adjust path if needed for your project structure
import { RootState } from '../../state/store';
import ReactJson from 'react-json-view';

// --- Type Definitions ---

interface Task {
  agent: string;
  args: any;
  id: number;
  parent_id: number | null;
  run_id: string;
  debug: any;
  child_ids: number[];
  result: any; // Key field for completion status
}

interface TaskData {
  version: string;
  content: Task[];
}

// --- TreeNode Component Definition ---

interface TreeNodeProps {
  task: Task;
  allTasks: Task[];
  level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ task, allTasks, level = 0 }) => {
  // Only state needed is for expanding/collapsing children and details
  const [isOpen, setIsOpen] = useState(level < 1); // Auto-expand root level

  const childTasks = useMemo(() => {
    if (!Array.isArray(task.child_ids)) {
        return [];
    }
    return allTasks.filter(t => task.child_ids.includes(t.id));
  }, [task.child_ids, allTasks]);

  const hasChildren = childTasks.length > 0;
  const hasDetails = task.args && Object.keys(task.args).length > 0 || task.result != null || (task.debug && Object.keys(task.debug).length > 0);
  const canExpand = hasChildren || hasDetails; // Can expand if it has children OR details to show

  const handleToggleExpand = (e?: React.MouseEvent) => {
    // Allow toggling even if only details are present
    if (canExpand) {
        e?.stopPropagation(); // Prevent triggering clicks on parent elements if event exists
        setIsOpen(!isOpen);
    }
  };

  // Refined Status Icon Logic:
  const getStatusIcon = () => {
    // 1. Check if result exists
    if (task.result != null) {
        // 2. Check if the result indicates an error (customize error patterns)
        if (typeof task.result === 'string' && /error|fail|exception/i.test(task.result)) {
            return <Icon as={WarningIcon} color="red.500" title="Failed" />;
        }
        // 3. If result exists and no error pattern matched, it's completed successfully
        return <Icon as={CheckCircleIcon} color="green.500" title="Completed" />;
    } else {
        // 4. If no result, it's pending/ongoing
        return <Icon as={TimeIcon} color="gray.500" title="Pending / Running" />;
    }
  };

  // Indentation style
  const indentPadding = level * 6; // Increase padding per level (adjust value as needed)

  return (
    <VStack align="stretch" spacing={0} w="100%">
      {/* Task Row - Clickable to toggle expansion */}
      <HStack
        spacing={1}
        pl={indentPadding} // Apply indentation here
        w="100%"
        _hover={{ bg: 'minusxBW.400', cursor: canExpand ? 'pointer' : 'default' }} // Hover effect and pointer cursor only if expandable
        p={1}
        borderRadius="md"
        onClick={handleToggleExpand} // Toggle expansion on row click
        title={canExpand ? (isOpen ? 'Click to collapse' : 'Click to expand') : undefined}
      >
        {/* Expand/Collapse Chevron */}
        <Box w="24px" flexShrink={0} textAlign="center">
          {canExpand ? (
            <Icon
              as={isOpen ? ChevronDownIcon : ChevronRightIcon}
              boxSize={4} // Adjust size as needed
              color="gray.500"
            />
          ) : (
            // Placeholder for alignment if not expandable
            <Box w="24px" h="24px" />
          )}
        </Box>

        {/* Status Icon */}
        <Box flexShrink={0} display="flex" alignItems="center">
          {getStatusIcon()}
        </Box>

        {/* Agent Name */}
        <Tooltip label={task.agent} placement="top-start" openDelay={500}>
          <Text fontSize="sm" fontWeight="500" noOfLines={1} flexGrow={1} title={task.agent}>
            {task.agent}
          </Text>
        </Tooltip>
      </HStack>

      {/* Collapsible Section for Details (Args/Result) and Children */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          pl={indentPadding + 6} // Indent details and children further than the parent row
          pt={1} // Add a little top padding
          pb={1} // Add a little bottom padding
          borderLeft="1px dashed" // Add a visual connector line
          borderColor="minusxBW.400" // Line color
          ml={`${indentPadding + 12}px`} // Position the line correctly (adjust as needed)
          mr={2} // Margin on the right
        >
          {/* Args Section */}
          {task.args && Object.keys(task.args).length > 0 && (
            <VStack align="stretch" spacing={1} mb={2}>
              <HStack spacing={1}>
                 <Icon as={InfoOutlineIcon} color="blue.500" boxSize={3.5}/>
                 <Text fontSize="xs" fontWeight="bold" color="minusxBW.700">Args:</Text>
                    <ReactJson
                    src={task.args}
                    collapsed={0}
                    name={false}
                    style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                    displayDataTypes={false}
                    enableClipboard={true}
                    />
              </HStack>
            </VStack>
          )}

          {/* Result Section */}
          {task.result != null && (
            <VStack align="stretch" spacing={1} mb={2}>
               <HStack spacing={1}>
                    {/* Use same icon as status for consistency, or a dedicated 'output' icon */}
                   <Icon as={InfoOutlineIcon} color="blue.500" boxSize={3.5}/>
                
                    <Text fontSize="xs" fontWeight="bold" color="minusxBW.700">Result:</Text>
                    {typeof task.result === 'string' ? (
                  <ReactJson
                  src={{"result": task.result}}
                  collapsed={0}
                  name={false}
                  style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                  displayDataTypes={false}
                  enableClipboard={true}
                />
                ) : (
                  <ReactJson
                    src={task.result}
                    collapsed={0}
                    name={false}
                    style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                    displayDataTypes={false}
                    enableClipboard={true}
                  />
                )}
               </HStack>
            </VStack>
          )}

          {/* Debug Section (Optional) */}
          {task.debug && Object.keys(task.debug).length > 0 && task.debug.duration !== 0 && (
            <VStack align="stretch" spacing={1} mb={2}>
              <HStack spacing={1}>
                 <Icon as={WarningIcon} color="orange.500" boxSize={3.5}/> {/* Example icon */}
                 <Text fontSize="xs" fontWeight="bold" color="minusxBW.700">Debug:</Text>
              </HStack>
              <Box bg="rgba(0,0,0,0.03)" p={2} borderRadius="md" maxW="100%" overflowX="auto">
                <ReactJson
                  src={task.debug}
                  collapsed={true}
                  name={false}
                  style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                  displayDataTypes={false}
                  enableClipboard={true}
                />
              </Box>
            </VStack>
          )}

          {/* Children Nodes */}
          {hasChildren && (
              <VStack align="stretch" spacing={0} pt={1}>
                  {childTasks.map((child) => (
                    // Children are rendered recursively; their own TreeNode will handle their indentation
                    <TreeNode key={child.id} task={child} allTasks={allTasks} level={level + 1} />
                  ))}
              </VStack>
          )}
        </Box>
      </Collapse>
    </VStack>
  );
};


// --- Main Tasks Component (Largely unchanged, but ensure state access is correct) ---

export const Tasks: React.FC = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread);
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread]);

  const tasksData: TaskData | undefined | null = activeThread?.tasks;

  const allTasks: Task[] = useMemo(() => {
      if (tasksData && Array.isArray(tasksData.content)) {
          return tasksData.content;
      }
      return [];
  }, [tasksData]);

  const rootTasks = useMemo(() => {
    const taskIds = new Set(allTasks.map(t => t.id));
    return allTasks.filter(task => task.parent_id === null || !taskIds.has(task.parent_id));
  }, [allTasks]);

  const isLoading = !activeThread || !tasksData;
  const isEmpty = !isLoading && allTasks.length === 0;

  return (
    <HStack
      aria-label={"tasks"}
      className={'tasks'}
      justifyContent={'start'}
      width={"100%"}
      alignItems="flex-start"
      overflowX={"scroll"}
    >
      <Box
        bg={'minusxBW.300'}
        p={2}
        borderRadius={5}
        color={'minusxBW.600'}
        width={"100%"}
        maxH="45vh"
        overflowY="auto"
        sx={{
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: 'minusxBW.400', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'minusxBW.500', borderRadius: '4px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'minusxBW.600' },
        }}
      >
        <VStack align="stretch" width={"100%"} p={1} spacing={2}>
          <HStack justifyContent="space-between">
            <HStack>
                 <Text fontSize={"sm"} fontWeight={600} color={'minusxBW.700'}>Tasks</Text>
                 {isLoading && <Spinner size="xs" speed={'0.75s'} color="minusxBW.600" />}
            </HStack>
          </HStack>

          <Box background={'minusxBW.200'} borderRadius={5} p={2} overflowX="auto">
            {isLoading ? (
               <Text fontSize="sm" color="minusxBW.600" textAlign="center">Loading tasks...</Text>
            ) : isEmpty ? (
              <Text fontSize="sm" color="minusxBW.600" textAlign="center">No tasks have been initiated yet.</Text>
            ) : (
              <VStack align="stretch" spacing={0}>
                {rootTasks.map((rootTask) => (
                  <TreeNode key={rootTask.id} task={rootTask} allTasks={allTasks} level={0} />
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </HStack>
  );
};