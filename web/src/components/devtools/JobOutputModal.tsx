import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Icon
} from '@chakra-ui/react';
import { BiFile, BiCode } from 'react-icons/bi';
import { CodeBlock } from '../common/CodeBlock';

interface JobOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  output: any;
  runId: number | null;
}

export const JobOutputModal: React.FC<JobOutputModalProps> = ({
  isOpen,
  onClose,
  output,
  runId
}) => {
  if (!output) return null;

  // Check if output has result
  const hasResult = output.result && typeof output.result === 'string';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          Job Output {runId ? `- Run #${runId}` : ''}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            <Accordion allowMultiple defaultIndex={hasResult ? [0] : [1]}>
              {/* Report Section */}
              {hasResult && (
                <AccordionItem>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <HStack spacing={2}>
                        <Icon as={BiFile} color="minusxGreen.600" />
                        <Text fontWeight="semibold">Report</Text>
                      </HStack>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <Box
                      p={4}
                      bg="minusxBW.100"
                      borderRadius="md"
                      maxH="500px"
                      overflowY="auto"
                    >
                      <Text
                        whiteSpace="pre-wrap"
                        fontFamily="inherit"
                        fontSize="sm"
                        lineHeight="1.6"
                      >
                        {output.result}
                      </Text>
                    </Box>
                  </AccordionPanel>
                </AccordionItem>
              )}

              {/* Raw JSON Section */}
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack spacing={2}>
                      <Icon as={BiCode} color="minusxGreen.600" />
                      <Text fontWeight="semibold">Raw JSON</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Box maxH="500px" overflowY="auto">
                    <CodeBlock
                      code={JSON.stringify(output, null, 2)}
                      tool="json"
                      language="json"
                    />
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
