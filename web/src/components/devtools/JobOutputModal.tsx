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
  Box,
  Icon,
  Badge
} from '@chakra-ui/react';
import { BiEnvelope } from 'react-icons/bi';
import DOMPurify from 'dompurify';

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

  // Check if output has emails
  const hasEmails = output.emails && Array.isArray(output.emails) && output.emails.length > 0;

  // Function to safely sanitize HTML with size limit
  const safeSanitize = (html: string): string => {
    if (!html) return '';
    // Limit HTML size to prevent browser freeze
    if (html.length > 500000) { // 500KB limit
      return '<div style="padding: 20px; color: #666;">Email content too large to display safely. View raw JSON instead.</div>';
    }
    try {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'p', 'span', 'a', 'b', 'i', 'u', 'strong', 'em', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'style'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'id', 'width', 'height', 'border', 'cellpadding', 'cellspacing', 'align', 'valign', 'bgcolor'],
        ALLOW_DATA_ATTR: false,
        KEEP_CONTENT: true
      });
    } catch (err) {
      console.error('Error sanitizing HTML:', err);
      return '<div style="padding: 20px; color: #666;">Error rendering email content. View raw JSON instead.</div>';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="90vw" maxH="90vh">
        <ModalHeader>
          Job Output {runId ? `- Run #${runId}` : ''}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {hasEmails ? (
            <VStack align="stretch" spacing={4}>
              {output.emails.map((email: any, index: number) => (
                <Box
                  key={index}
                  borderWidth={1}
                  borderColor="gray.200"
                  borderRadius="md"
                  overflow="hidden"
                >
                  {/* Email Header */}
                  <Box p={3} bg="gray.50" borderBottomWidth={1} borderBottomColor="gray.200">
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="semibold">
                        Email {index + 1}
                      </Text>
                      {email.html && (
                        <Badge colorScheme="green" fontSize="xs">HTML</Badge>
                      )}
                      {email.text && !email.html && (
                        <Badge colorScheme="blue" fontSize="xs">Text</Badge>
                      )}
                    </HStack>
                    {email.subject && (
                      <Text fontSize="xs" color="gray.600">
                        <strong>Subject:</strong> {email.subject}
                      </Text>
                    )}
                  </Box>

                  {/* Email Content */}
                  <Box p={4}>
                    {email.html ? (
                      <Box
                        bg="white"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        maxH="600px"
                        overflowY="auto"
                        p={3}
                        dangerouslySetInnerHTML={{
                          __html: safeSanitize(email.html)
                        }}
                      />
                    ) : email.text ? (
                      <Box
                        as="pre"
                        bg="gray.50"
                        p={3}
                        borderRadius="md"
                        fontSize="sm"
                        maxH="600px"
                        overflowY="auto"
                        whiteSpace="pre-wrap"
                        wordBreak="break-word"
                        fontFamily="inherit"
                      >
                        {email.text}
                      </Box>
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        No content available
                      </Text>
                    )}
                  </Box>
                </Box>
              ))}
            </VStack>
          ) : (
            <Box p={8} textAlign="center">
              <Icon as={BiEnvelope} fontSize="3xl" color="gray.400" mb={3} />
              <Text fontSize="sm" color="gray.600">
                No email content available in this output
              </Text>
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
