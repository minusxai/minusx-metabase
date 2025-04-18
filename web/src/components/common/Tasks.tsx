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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
    BiChevronDown,
    BiChevronRight,
    BiSolidCheckCircle,
    BiSolidErrorCircle,
    BiHourglass,
    BiSolidInfoCircle,
    BiSolidBug,
    BiExpand
} from 'react-icons/bi';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store'; // Assuming this path is correct
import ReactJson from 'react-json-view';
import { Task, Tasks as TasksInfo } from '../../state/chat/reducer'; // Assuming this path is correct
import { get, last } from 'lodash';

interface TreeNodeProps {
  task: Task;
  allTasks: TasksInfo;
  level?: number;
  initiallyOpen?: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
    task,
    allTasks,
    level = 0,
    initiallyOpen = level < 1
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);

  const childTasks = useMemo(() => {
    if (!Array.isArray(task.child_ids)) {
        return [];
    }
    return allTasks.filter(t => task.child_ids.includes(t.id));
  }, [task.child_ids, allTasks]);

  const hasChildren = childTasks.length > 0;
  // Check if args/result/debug exist and are not empty objects/null/zero duration
  const hasArgs = task.args && Object.keys(task.args).length > 0;
  const hasResult = task.result != null;
  const hasDebug = task.debug && Object.keys(task.debug).length > 0 && ((task.debug as any).duration !== 0 || Object.keys(task.debug).length > 1);
  const hasDetails = hasArgs || hasResult || hasDebug;
  const canExpand = hasChildren || hasDetails;

  const handleToggleExpand = (e?: React.MouseEvent) => {
    if (canExpand) {
        e?.stopPropagation();
        setIsOpen(!isOpen);
    }
  };

  const getStatusIcon = () => {
    if (task.result != null) {
        const resultString = typeof task.result === 'string' ? task.result : JSON.stringify(task.result);
        const isError = (typeof task.result === 'object' && task.result !== null && (task.result as any).error) || /error|fail|exception/i.test(resultString);
        if (isError) {
            return <Icon as={BiSolidErrorCircle} color="red.500" title="Failed" />;
        }
        return <Icon as={BiSolidCheckCircle} color="green.500" title="Completed" />;
    } else {
        if ((task as any).status === 'running') { // Check for explicit running status if available
             return <Spinner size="xs" speed="0.8s" thickness="2px" color="blue.500" title="Running" />;
        }
        return <Icon as={BiHourglass} color="gray.500" title="Pending" />;
    }
  };

  const indentPadding = level * 6;

  return (
    <VStack align="stretch" spacing={0} w="100%">
      <HStack
        spacing={1}
        pl={indentPadding}
        w="100%"
        _hover={{ bg: 'minusxBW.400', cursor: canExpand ? 'pointer' : 'default' }}
        p={1}
        borderRadius="md"
        onClick={handleToggleExpand}
        title={canExpand ? (isOpen ? 'Click to collapse' : 'Click to expand') : task.agent}
      >
        <Box w="20px" flexShrink={0} textAlign="center">
            {canExpand ? (
                <Icon
                as={isOpen ? BiChevronDown : BiChevronRight}
                boxSize={4}
                color="gray.500"
                />
            ) : (
                <Box w="4px" h="4px" bg="gray.400" borderRadius="full" display="inline-block" ml="8px" />
            )}
        </Box>

        <Box flexShrink={0} display="flex" alignItems="center" w="20px" justifyContent="center">
          {getStatusIcon()}
        </Box>

        <Tooltip label={task.agent} placement="top-start" openDelay={500}>
          <Text fontSize="sm" fontWeight="500" noOfLines={1} flexGrow={1} title={task.agent}>
            {task.agent}
          </Text>
        </Tooltip>
      </HStack>

      <Collapse in={isOpen && canExpand} animateOpacity>
        <Box
          pl={indentPadding + 6}
          pt={1}
          pb={1}
          borderLeft="1px dashed"
          borderColor="minusxBW.400"
          ml={`${indentPadding + 10}px`}
          mr={2}
        >
          {/* Args Section */}
          {hasArgs && (
            <VStack align="stretch" spacing={1} mb={2}>
              <HStack spacing={1} alignItems="flex-start">
                 <Icon as={BiSolidInfoCircle} color="blue.500" boxSize={3.5} mt="0.5"/>
                 <Text fontSize="xs" fontWeight="bold" color="minusxBW.700" flexShrink={0}>Args:</Text>
                 <Box flexGrow={1} overflowX="auto" >
                     <ReactJson
                        src={task.args!} // We know it exists due to hasArgs check
                        collapsed={1}
                        name={false}
                        style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                        displayDataTypes={false}
                        enableClipboard={true}
                     />
                 </Box>
              </HStack>
            </VStack>
          )}

          {/* Result Section */}
          {hasResult && (
            <VStack align="stretch" spacing={1} mb={2}>
               <HStack spacing={1} alignItems="flex-start">
                    <Icon as={BiSolidInfoCircle} color={ (typeof task.result === 'string' && /error|fail|exception/i.test(task.result)) || (typeof task.result === 'object' && task.result !== null && (task.result as any).error) ? "red.500" : "purple.500"} boxSize={3.5} mt="0.5"/>
                   <Text fontSize="xs" fontWeight="bold" color="minusxBW.700" flexShrink={0}>Result:</Text>
                   <Box flexGrow={1} overflowX="auto">
                       {typeof task.result === 'string' ? (
                           <ReactJson
                                src={{"result": task.result}}
                                collapsed={1}
                                name={false}
                                style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                                displayDataTypes={false}
                                enableClipboard={true}
                           />
                       ) : (
                           <ReactJson
                                src={task.result!} // We know it's not null due to hasResult check
                                collapsed={1}
                                name={false}
                                style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                                displayDataTypes={false}
                                enableClipboard={true}
                           />
                       )}
                   </Box>
               </HStack>
            </VStack>
          )}

          {/* Debug Section */}
          {hasDebug && (
             <VStack align="stretch" spacing={1} mb={2}>
               <HStack spacing={1} alignItems="flex-start">
                 <Icon as={BiSolidBug} color="orange.500" boxSize={3.5} mt="0.5"/>
                 <Text fontSize="xs" fontWeight="bold" color="minusxBW.700" flexShrink={0}>Debug:</Text>
               </HStack>
               <Box bg="blackAlpha.50" _dark={{ bg:"whiteAlpha.50"}} p={2} borderRadius="md" maxW="100%" overflowX="auto">
                 <ReactJson
                   src={task.debug!} // We know it exists due to hasDebug check
                   collapsed={true}
                   name={false}
                   style={{ fontSize: '0.75em', backgroundColor: 'transparent' }}
                   displayDataTypes={false}
                   enableClipboard={true}
                 />
               </Box>
             </VStack>
           )}

          {/* Child Nodes */}
          {hasChildren && (
              <VStack align="stretch" spacing={0} pt={1}>
                  {childTasks.map((child) => (
                    <TreeNode
                        key={child.id}
                        task={child}
                        allTasks={allTasks}
                        level={level + 1}
                        // Expand first level children if parent was initially open in modal
                        initiallyOpen={initiallyOpen && level < 1}
                    />
                  ))}
              </VStack>
          )}
        </Box>
      </Collapse>
    </VStack>
  );
};


export const Tasks: React.FC = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread);
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread]);
  const allTasks: TasksInfo = activeThread?.tasks || [];

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

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

  const isEmpty = allTasks.length === 0;
  const isLoading = !isEmpty && rootTasks.length > 0 && !last(rootTasks)?.result;

  const lastMessage = last(activeThread?.messages);
  const lastMessageContent = get(lastMessage, 'content');
  const isStarting = (
      get(lastMessage, 'role') === 'user' ||
      (typeof lastMessageContent === 'string' && lastMessageContent.includes('/start_task'))
    ) && (isEmpty || isLoading);

  const renderTaskTree = (isModal = false) => {
     if (isStarting && !isModal) {
         return <Text fontSize="sm" color="minusxBW.600" textAlign="center" p={4}>Loading tasks...</Text>;
     }
     if (isEmpty) {
       return <Text fontSize="sm" color="minusxBW.600" textAlign="center" p={4}>No tasks initiated.</Text>;
     }
    return (
      <VStack align="stretch" spacing={0} p={isModal ? 0 : 2}>
        {rootTasks.map((rootTask) => (
          <TreeNode
             key={`${rootTask.id}-${isModal ? 'modal' : 'panel'}`}
             task={rootTask}
             allTasks={allTasks}
             level={0}
             initiallyOpen={isModal ? true : rootTask.level < 1} // Expand root in modal
          />
        ))}
      </VStack>
    );
  };

  // Common scrollbar styles
  const scrollbarStyles = {
    '&::-webkit-scrollbar': { width: ['6px', '8px'] }, // Smaller on panel, larger in modal potentially
    '&::-webkit-scrollbar-track': { background: 'minusxBW.400', borderRadius: '4px' },
    '&::-webkit-scrollbar-thumb': { background: 'minusxBW.500', borderRadius: '4px' },
    '&::-webkit-scrollbar-thumb:hover': { background: 'minusxBW.600' },
  };

  return (
    <>
      {/* Side Panel View */}
      <HStack
        aria-label={"tasks-panel"}
        className={'tasks-panel'}
        justifyContent={'start'}
        width={"100%"}
        alignItems="flex-start"
      >
        <Box
          bg={'minusxBW.300'}
          p={2}
          borderRadius={5}
          color={'minusxBW.600'}
          width={"100%"}
          maxH="45vh"
          overflowY="auto"
          sx={scrollbarStyles}
        >
          <VStack align="stretch" width={"100%"} spacing={1}>
            <HStack justifyContent="space-between" px={1} mb={1}>
              <HStack>
                 <Text fontSize={"sm"} fontWeight={600} color={'minusxBW.700'}>Tasks</Text>
                 {(isLoading || isStarting) && <Spinner size="xs" speed={'0.75s'} color="minusxBW.600" />}
              </HStack>
              <Tooltip label="Expand Tasks View" openDelay={300}>
                  <IconButton
                    icon={<Icon as={BiExpand} />}
                    size="xs"
                    variant="ghost"
                    color="minusxBW.600"
                    aria-label="Expand Tasks View"
                    onClick={onModalOpen}
                    isDisabled={isEmpty && !isStarting}
                  />
              </Tooltip>
            </HStack>

            <Box background={'minusxBW.200'} borderRadius={5} overflowX="auto">
                {renderTaskTree(false)}
            </Box>
          </VStack>
        </Box>
      </HStack>

      {/* Modal View */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent maxW="85vw" h="90vh" bg="minusxBW.200">
          <ModalHeader pb={2} pt={4} px={4}>
             <HStack justifyContent="space-between">
                 <HStack>
                    <Text fontSize={"lg"} fontWeight={600} color={'minusxBW.800'}>Task Details</Text>
                     {(isLoading || isStarting) && <Spinner size="sm" speed={'0.75s'} color="minusxBW.700" />}
                 </HStack>
             </HStack>
          </ModalHeader>
          <ModalCloseButton top={4} right={4}/>
          <ModalBody p={4} sx={{
                // Use slightly larger scrollbars for modal
                '&::-webkit-scrollbar': { width: '10px' },
                '&::-webkit-scrollbar-track': { background: 'minusxBW.300', borderRadius: '5px' },
                '&::-webkit-scrollbar-thumb': { background: 'minusxBW.500', borderRadius: '5px' },
                '&::-webkit-scrollbar-thumb:hover': { background: 'minusxBW.600' },
            }}>
              {renderTaskTree(true)}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};