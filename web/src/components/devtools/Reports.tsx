import React, { useState, useEffect } from 'react';
import {
  Text,
  Box,
  HStack,
  VStack,
  Button,
  Icon,
  Spinner,
  Badge,
  Input,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  FormControl,
  FormLabel,
  InputGroup,
  InputLeftElement,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody
} from '@chakra-ui/react';
import {
  BiChevronDown,
  BiCheck,
  BiGlobe,
  BiCalendar,
  BiEnvelope,
  BiPlay,
  BiRefresh,
  BiHistory,
  BiX,
  BiPlus,
  BiTrash,
  BiEdit,
  BiSave,
  BiShow,
  BiSearch
} from 'react-icons/bi';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { JobOutputModal } from './JobOutputModal';
import {
  useExecuteJobMutation,
  useLazyGetJobRunHistoryQuery,
  useSendJobEmailMutation,
  useCreateAssetMutation,
  type JobRun,
  type JobStatus
} from '../../app/api/atlasApi';
import { configs } from '../../constants';

// Type for scheduled report content
interface ScheduledReportContent {
  url?: string;
  questions?: string[];
  schedule?: string;
  emails?: string[];
  template?: string;
  isActive?: boolean;
}

// Schedule options
const SCHEDULE_OPTIONS = [
  { value: '0 9 * * *', label: 'Daily at 9 AM' },
  { value: '0 9 * * 1', label: 'Weekly on Monday at 9 AM' },
  { value: '0 9 1 * *', label: 'Monthly on 1st at 9 AM' }
];

const formatScheduleDisplay = (schedule: string) => {
  if (schedule.includes('0 9 * * 1')) return 'Weekly on Monday at 9 AM';
  if (schedule.includes('0 9 * * *')) return 'Daily at 9 AM';
  if (schedule.includes('0 9 1 * *')) return 'Monthly on 1st at 9 AM';
  return schedule || 'Not scheduled';
};

const getStatusColor = (status: JobStatus): string => {
  switch (status) {
    case 'RUNNING':
      return 'blue';
    case 'SUCCESS':
      return 'green';
    case 'FAILURE':
      return 'red';
    case 'TIMEOUT':
      return 'orange';
    default:
      return 'gray';
  }
};

const formatDuration = (startTime: string, endTime: string | null): string => {
  if (!endTime) return 'Running...';

  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;

  if (durationMs < 60000) {
    return `${Math.round(durationMs / 1000)}s`;
  } else if (durationMs < 3600000) {
    return `${Math.round(durationMs / 60000)}m`;
  } else {
    return `${Math.round(durationMs / 3600000)}h`;
  }
};

export const Reports: React.FC = () => {
  const toast = useToast();
  const availableAssets = useSelector((state: RootState) => state.settings.availableAssets).filter(
    (asset) => asset?.type === 'scheduled_report'
  );
  const assetsLoading = useSelector((state: RootState) => state.settings.assetsLoading);
  const session_jwt = useSelector((state: RootState) => state.auth.session_jwt);
  const userCompanies = useSelector((state: RootState) => state.settings.userCompanies);
  const userTeams = useSelector((state: RootState) => state.settings.userTeams);

  // State
  const [selectedAssetSlug, setSelectedAssetSlug] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState<any>(null);

  // Job management state
  const [isForced, setIsForced] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [outputModalVisible, setOutputModalVisible] = useState(false);
  const [selectedOutput, setSelectedOutput] = useState<any>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  // Asset search state
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    teamSlug: '',
    name: '',
    url: '',
    questions: [''],
    schedule: SCHEDULE_OPTIONS[0].value,
    emails: [''],
    asUser: ''  // For godmode: which admin to act as
  });

  // API hooks
  const [executeJob, { isLoading: isExecuting }] = useExecuteJobMutation();
  const [getJobRunHistory, { data: runHistory = [], isFetching: historyLoading }] = useLazyGetJobRunHistoryQuery();
  const [sendJobEmail, { isLoading: sendingEmail }] = useSendJobEmailMutation();
  const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation();

  // Get admin teams (or all teams for godmode users)
  const isGodMode = userCompanies.some(c => c.role === 'godmode_access');
  const adminCompanySlugs = isGodMode
    ? userCompanies.map(c => c.slug)  // Godmode can access all companies
    : userCompanies.filter(c => c.role === 'admin').map(c => c.slug);
  const adminTeams = userTeams.filter(t => adminCompanySlugs.includes(t.company_slug));
  const canCreateReport = adminTeams.length > 0;

  // Debug logging
  React.useEffect(() => {
    console.log('[Reports] Is god mode:', isGodMode);
    console.log('[Reports] User companies:', userCompanies);
    console.log('[Reports] User teams:', userTeams);
    console.log('[Reports] Admin company slugs:', adminCompanySlugs);
    console.log('[Reports] Admin teams:', adminTeams);
    console.log('[Reports] Can create report:', canCreateReport);
  }, [isGodMode, userCompanies, userTeams, adminCompanySlugs, adminTeams, canCreateReport]);

  // Find selected asset
  const selectedAsset = availableAssets.find((asset) => asset.slug === selectedAssetSlug) ||
    (availableAssets.length > 0 ? availableAssets[0] : null);

  // Extract report data
  const reportData = (selectedAsset?.content || {}) as ScheduledReportContent;
  const assetId = (selectedAsset as any)?.id;

  // Don't auto-load job history - let it be lazy loaded when user expands accordion

  // Initialize edited report when entering edit mode
  useEffect(() => {
    if (isEditing && selectedAsset) {
      setEditedReport({
        url: reportData.url || '',
        questions: reportData.questions || [],
        schedule: reportData.schedule || SCHEDULE_OPTIONS[0].value,
        emails: reportData.emails || []
      });
    }
  }, [isEditing, selectedAsset, reportData]);

  const handleAssetSelection = (assetSlug: string) => {
    setSelectedAssetSlug(assetSlug);
    setIsEditing(false);
    setIsAssetDropdownOpen(false);
    setAssetSearchQuery('');
  };

  // Filter assets by search query
  const filteredAssets = React.useMemo(() => {
    if (!assetSearchQuery.trim()) return availableAssets;

    const query = assetSearchQuery.toLowerCase();
    return availableAssets.filter((asset) => {
      const assetName = asset.name.toLowerCase();
      const teamName = userTeams.find(t => t.slug === asset.team_slug)?.name?.toLowerCase() || '';
      return assetName.includes(query) || teamName.includes(query);
    });
  }, [assetSearchQuery, availableAssets, userTeams]);

  const handleSave = async () => {
    if (!selectedAsset || !editedReport) return;

    try {
      // Call the backend API to update the asset
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add Authorization header if JWT is available
      if (session_jwt) {
        headers['Authorization'] = `Bearer ${session_jwt}`;
      }

      const response = await fetch(
        `${configs.ATLAS_BASE_URL}/company/${selectedAsset.company_slug}/team/${selectedAsset.team_slug}/asset/${selectedAsset.slug}`,
        {
          method: 'PATCH',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: selectedAsset.name,
            content: {
              ...selectedAsset.content,
              ...editedReport
            }
          })
        }
      );

      if (response.ok) {
        toast({
          title: 'Report updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        setIsEditing(false);
        // Optionally trigger a refetch of assets
      } else {
        throw new Error('Failed to update report');
      }
    } catch (error) {
      toast({
        title: 'Failed to update report',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleRunJob = async () => {
    if (!assetId) return;

    try {
      const result = await executeJob({
        assetIds: [assetId],
        isForced,
        sendEmail
      }).unwrap();

      if (result.job_runs && result.job_runs.length > 0) {
        toast({
          title: `Job started! Run ID: ${result.job_runs[0].id}`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        // Refresh job history
        getJobRunHistory(assetId);
      } else if (result.new_runs_created === 0) {
        toast({
          title: 'Job already running or recently completed',
          description: 'Use "Force" to run anyway',
          status: 'info',
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to execute job',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleSendEmail = async (runId: number) => {
    try {
      await sendJobEmail(runId).unwrap();
      toast({
        title: 'Email sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      // Refresh job history
      if (assetId) {
        getJobRunHistory(assetId);
      }
    } catch (error) {
      toast({
        title: 'Failed to send email',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleCreateReport = async () => {
    // Validation
    if (!newReport.teamSlug) {
      toast({
        title: 'Please select a team',
        status: 'error',
        duration: 3000
      });
      return;
    }
    if (!newReport.name.trim()) {
      toast({
        title: 'Please enter a report name',
        status: 'error',
        duration: 3000
      });
      return;
    }
    if (!newReport.url.trim()) {
      toast({
        title: 'Please enter a report URL',
        status: 'error',
        duration: 3000
      });
      return;
    }
    const validQuestions = newReport.questions.filter(q => q.trim());
    if (validQuestions.length === 0) {
      toast({
        title: 'Please add at least one question',
        status: 'error',
        duration: 3000
      });
      return;
    }
    const validEmails = newReport.emails.filter(e => e.trim());
    if (validEmails.length === 0) {
      toast({
        title: 'Please add at least one email',
        status: 'error',
        duration: 3000
      });
      return;
    }

    try {
      const selectedTeam = adminTeams.find(t => t.slug === newReport.teamSlug);
      if (!selectedTeam) throw new Error('Team not found');

      await createAsset({
        companySlug: selectedTeam.company_slug,
        teamSlug: selectedTeam.slug,
        data: {
          name: newReport.name,
          type: 'scheduled_report',
          content: {
            url: newReport.url,
            questions: validQuestions,
            schedule: newReport.schedule,
            emails: validEmails
          }
        },
        asUser: isGodMode && newReport.asUser ? newReport.asUser : undefined
      }).unwrap();

      toast({
        title: 'Report created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Reset form and close modal
      setNewReport({
        teamSlug: '',
        name: '',
        url: '',
        questions: [''],
        schedule: SCHEDULE_OPTIONS[0].value,
        emails: [''],
        asUser: ''
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      toast({
        title: 'Failed to create report',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleAddQuestion = () => {
    if (editedReport) {
      setEditedReport({
        ...editedReport,
        questions: [...editedReport.questions, '']
      });
    }
  };

  const handleRemoveQuestion = (index: number) => {
    if (editedReport) {
      setEditedReport({
        ...editedReport,
        questions: editedReport.questions.filter((_: any, i: number) => i !== index)
      });
    }
  };

  const handleQuestionChange = (index: number, value: string) => {
    if (editedReport) {
      const newQuestions = [...editedReport.questions];
      newQuestions[index] = value;
      setEditedReport({
        ...editedReport,
        questions: newQuestions
      });
    }
  };

  if (assetsLoading) {
    return (
      <VStack spacing={3} py={8} textAlign="center">
        <Spinner size="md" color="minusxGreen.500" />
        <Text fontSize="sm" color="gray.600">Loading reports...</Text>
      </VStack>
    );
  }

  if (availableAssets.length === 0) {
    return (
      <VStack spacing={2} py={8} textAlign="center">
        <Text fontSize="sm" color="gray.600" fontWeight="medium">
          No Reports Available
        </Text>
        <Text fontSize="xs" color="gray.500" lineHeight="1.4" maxWidth="300px">
          Contact your team admin to set up scheduled reports
        </Text>
      </VStack>
    );
  }

  return (
    <VStack width="100%" align="stretch" spacing={4}>
      {/* Header */}
      <VStack width="100%" align="stretch" spacing={2}>
        <HStack justify="space-between" align="center" width="100%">
          <Text fontSize="2xl" fontWeight="bold">Reports</Text>
          {canCreateReport && (
            <Button
              size="sm"
              colorScheme="minusxGreen"
              leftIcon={<BiPlus />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create New Report
            </Button>
          )}
        </HStack>
      </VStack>

      {/* Report Selection - Searchable Dropdown */}
      <Box>
        <Popover
          isOpen={isAssetDropdownOpen}
          onClose={() => {
            setIsAssetDropdownOpen(false);
            setAssetSearchQuery('');
          }}
          placement="bottom-start"
          matchWidth
        >
          <PopoverTrigger>
            <Button
              onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
              rightIcon={<BiChevronDown />}
              size="sm"
              width="100%"
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              color="minusxBW.800"
              _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
              _active={{ bg: 'gray.100', borderColor: 'gray.400' }}
              fontWeight="normal"
              textAlign="left"
              justifyContent="space-between"
            >
              <VStack align="start" spacing={0} width="100%">
                <Text fontSize="sm">{selectedAsset?.name || availableAssets[0]?.name}</Text>
                {selectedAsset && (
                  <Text fontSize="xs" color="gray.500">
                    {userTeams.find(t => t.slug === selectedAsset.team_slug)?.name || ''}
                  </Text>
                )}
              </VStack>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            width="100%"
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            boxShadow="lg"
          >
            <PopoverBody p={0}>
              <VStack spacing={0} align="stretch">
                {/* Search Input */}
                <Box p={2} borderBottom="1px solid" borderColor="gray.200">
                  <InputGroup size="sm">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={BiSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Search reports or teams..."
                      value={assetSearchQuery}
                      onChange={(e) => setAssetSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </InputGroup>
                </Box>

                {/* Asset List */}
                <Box maxH="300px" overflowY="auto">
                  {filteredAssets.length === 0 ? (
                    <Box p={4} textAlign="center">
                      <Text fontSize="sm" color="gray.500">No reports found</Text>
                    </Box>
                  ) : (
                    filteredAssets.map((asset) => {
                      const team = userTeams.find(t => t.slug === asset.team_slug);
                      const isSelected = (selectedAssetSlug || availableAssets[0]?.slug) === asset.slug;

                      return (
                        <Box
                          key={`${asset.company_slug}-${asset.slug}`}
                          onClick={() => handleAssetSelection(asset.slug)}
                          px={3}
                          py={2}
                          cursor="pointer"
                          bg={isSelected ? 'gray.50' : 'white'}
                          _hover={{ bg: 'gray.50' }}
                          borderBottom="1px solid"
                          borderColor="gray.100"
                        >
                          <HStack justify="space-between" align="center">
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="sm" color="minusxBW.800" fontWeight={isSelected ? 'medium' : 'normal'}>
                                {asset.name}
                              </Text>
                              {team && (
                                <Text fontSize="xs" color="gray.500">
                                  {team.name}
                                </Text>
                              )}
                            </VStack>
                            {isSelected && (
                              <Icon as={BiCheck} boxSize={4} color="minusxGreen.500" />
                            )}
                          </HStack>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Box>

      {/* Report Details */}
      {selectedAsset && (
        <VStack align="stretch" spacing={4}>
          {/* Edit/View Mode Toggle */}
          {selectedAsset.permission === 'edit' && !isEditing && (
            <HStack justify="flex-end">
              <Button
                size="sm"
                leftIcon={<BiEdit />}
                colorScheme="minusxGreen"
                onClick={() => setIsEditing(true)}
              >
                Edit Report
              </Button>
            </HStack>
          )}

          {isEditing ? (
            /* Edit Mode */
            <VStack align="stretch" spacing={4} p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="lg" fontWeight="semibold">Edit Report Configuration</Text>

              {/* URL */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Report URL *</Text>
                <Input
                  value={editedReport?.url || ''}
                  onChange={(e) => setEditedReport({ ...editedReport, url: e.target.value })}
                  placeholder="https://example.com/dashboard"
                  size="sm"
                />
              </Box>

              {/* Questions */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Questions *</Text>
                <VStack align="stretch" spacing={2}>
                  {editedReport?.questions?.map((question: string, index: number) => (
                    <HStack key={index}>
                      <Input
                        value={question}
                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                        placeholder="Enter a question"
                        size="sm"
                        flex={1}
                      />
                      <IconButton
                        aria-label="Remove question"
                        icon={<BiTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleRemoveQuestion(index)}
                      />
                    </HStack>
                  ))}
                  <Button
                    size="sm"
                    leftIcon={<BiPlus />}
                    variant="outline"
                    onClick={handleAddQuestion}
                  >
                    Add Question
                  </Button>
                </VStack>
              </Box>

              {/* Schedule */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Schedule *</Text>
                <Select
                  value={editedReport?.schedule || SCHEDULE_OPTIONS[0].value}
                  onChange={(e) => setEditedReport({ ...editedReport, schedule: e.target.value })}
                  size="sm"
                >
                  {SCHEDULE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Box>

              {/* Emails - Read Only */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>Email Recipients (Read Only)</Text>
                <Box p={2} bg="gray.100" borderRadius="md" border="1px solid" borderColor="gray.300">
                  <HStack spacing={2} wrap="wrap">
                    {editedReport?.emails?.map((email: string, index: number) => (
                      <Badge key={index} colorScheme="blue" fontSize="xs">
                        {email}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Email recipients cannot be edited from this interface
                </Text>
              </Box>

              {/* Action Buttons */}
              <HStack justify="flex-end" spacing={2}>
                <Button
                  size="sm"
                  leftIcon={<BiX />}
                  onClick={() => {
                    setIsEditing(false);
                    setEditedReport(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  leftIcon={<BiSave />}
                  colorScheme="minusxGreen"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </HStack>
            </VStack>
          ) : (
            /* View Mode */
            <VStack align="stretch" spacing={3}>
              {/* URL */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <HStack mb={1}>
                  <Icon as={BiGlobe} color="minusxGreen.600" />
                  <Text fontSize="sm" fontWeight="semibold">Report URL</Text>
                </HStack>
                <Text fontSize="xs" color="gray.700" fontFamily="monospace" wordBreak="break-all">
                  {reportData.url || 'Not set'}
                </Text>
              </Box>

              {/* Schedule */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <HStack mb={1}>
                  <Icon as={BiCalendar} color="minusxGreen.600" />
                  <Text fontSize="sm" fontWeight="semibold">Schedule</Text>
                </HStack>
                <Text fontSize="xs" color="gray.700">
                  {formatScheduleDisplay(reportData.schedule || '')}
                </Text>
              </Box>

              {/* Questions */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Questions ({reportData.questions?.length || 0})
                </Text>
                <VStack align="stretch" spacing={1}>
                  {reportData.questions?.map((question: string, index: number) => (
                    <HStack key={index} align="flex-start" spacing={2}>
                      <Text fontSize="xs" color="minusxGreen.600" fontWeight="semibold" minW="20px">
                        {index + 1}.
                      </Text>
                      <Text fontSize="xs" color="gray.700">
                        {question}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              {/* Recipients */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <HStack mb={2}>
                  <Icon as={BiEnvelope} color="minusxGreen.600" />
                  <Text fontSize="sm" fontWeight="semibold">
                    Recipients ({reportData.emails?.length || 0})
                  </Text>
                </HStack>
                <HStack spacing={2} wrap="wrap">
                  {reportData.emails?.map((email: string, index: number) => (
                    <Badge key={index} colorScheme="blue" fontSize="xs">
                      {email}
                    </Badge>
                  ))}
                </HStack>
              </Box>
            </VStack>
          )}

          {/* Job Runs Section */}
          <Box mt={4} p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
            <Accordion
              allowMultiple
              onChange={(expandedIndices) => {
                // Load job history when accordion is expanded
                const indices = Array.isArray(expandedIndices) ? expandedIndices : [expandedIndices];
                if (indices.includes(0) && assetId && runHistory.length === 0 && !historyLoading) {
                  getJobRunHistory(assetId);
                }
              }}
            >
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex="1" textAlign="left">
                    <Icon as={BiPlay} color="minusxGreen.600" fontSize="xl" />
                    <Text fontWeight="semibold">Job Runs</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0} pb={4}>
                  {/* Job Controls */}
                  <Box p={3} bg="gray.50" borderRadius="md" mb={4}>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="semibold">Manual Execution</Text>
                      <HStack spacing={3}>
                        <Checkbox
                          size="sm"
                          isChecked={isForced}
                          onChange={(e) => setIsForced(e.target.checked)}
                          isDisabled={isExecuting}
                        >
                          <Text fontSize="xs">Force Run</Text>
                        </Checkbox>
                        <Checkbox
                          size="sm"
                          isChecked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          isDisabled={isExecuting}
                        >
                          <Text fontSize="xs">Send Email</Text>
                        </Checkbox>
                        <Button
                          size="sm"
                          leftIcon={<BiPlay />}
                          colorScheme="minusxGreen"
                          isLoading={isExecuting}
                          onClick={handleRunJob}
                          isDisabled={!reportData.url || !reportData.questions?.length}
                        >
                          Run Now
                        </Button>
                        <Tooltip label="Refresh run history">
                          <IconButton
                            aria-label="Refresh"
                            icon={<BiRefresh />}
                            size="sm"
                            isLoading={historyLoading}
                            onClick={() => assetId && getJobRunHistory(assetId)}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                    <VStack align="stretch" spacing={1}>
                      <Text fontSize="xs" color="gray.600">
                        <strong>Force Run:</strong> Bypasses duplicate prevention
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        <strong>Send Email:</strong> Triggers email notifications
                      </Text>
                    </VStack>
                  </Box>

                  {/* Run History */}
                  <Box>
                    <HStack mb={3}>
                      <Icon as={BiHistory} color="minusxGreen.600" />
                      <Text fontSize="sm" fontWeight="semibold">
                        Execution History ({runHistory.length})
                      </Text>
                    </HStack>

                    {runHistory.length === 0 ? (
                      <VStack py={8}>
                        <Icon as={BiHistory} fontSize="2xl" color="gray.400" />
                        <Text fontSize="xs" color="gray.500">
                          {historyLoading ? 'Loading run history...' : 'No job runs yet'}
                        </Text>
                        {!historyLoading && (
                          <Text fontSize="xs" color="gray.400">
                            Click "Run Now" to execute this report manually
                          </Text>
                        )}
                      </VStack>
                    ) : (
                      <Box overflowX="auto">
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Run ID</Th>
                              <Th>Status</Th>
                              <Th>Started</Th>
                              <Th>Completed</Th>
                              <Th>Duration</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {runHistory.map((run: JobRun) => (
                              <Tr key={run.id}>
                                <Td>
                                  <Text fontSize="xs" fontFamily="monospace">#{run.id}</Text>
                                </Td>
                                <Td>
                                  <Badge colorScheme={getStatusColor(run.status)} fontSize="xs">
                                    {run.status}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Text fontSize="xs">
                                    {new Date(run.created_at).toLocaleString()}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontSize="xs">
                                    {run.completed_at
                                      ? new Date(run.completed_at).toLocaleString()
                                      : 'Running...'}
                                  </Text>
                                </Td>
                                <Td>
                                  <Text fontSize="xs">
                                    {formatDuration(run.created_at, run.completed_at)}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing={2}>
                                    {run.output && (
                                      <Button
                                        size="xs"
                                        leftIcon={<BiShow />}
                                        colorScheme="green"
                                        variant="ghost"
                                        onClick={() => {
                                          setSelectedOutput(run.output);
                                          setSelectedRunId(run.id);
                                          setOutputModalVisible(true);
                                        }}
                                      >
                                        View
                                      </Button>
                                    )}
                                    {run.output && run.status === 'SUCCESS' && (
                                      <Button
                                        size="xs"
                                        leftIcon={<BiEnvelope />}
                                        colorScheme="blue"
                                        variant="ghost"
                                        isLoading={sendingEmail}
                                        onClick={() => handleSendEmail(run.id)}
                                      >
                                        Email
                                      </Button>
                                    )}
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        </VStack>
      )}

      {/* Job Output Modal */}
      <JobOutputModal
        isOpen={outputModalVisible}
        onClose={() => setOutputModalVisible(false)}
        output={selectedOutput}
        runId={selectedRunId}
      />

      {/* Create Report Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {/* Team Selection */}
              <FormControl isRequired>
                <FormLabel>Team</FormLabel>
                <Select
                  value={newReport.teamSlug}
                  onChange={(e) => setNewReport({ ...newReport, teamSlug: e.target.value })}
                  placeholder="Select team"
                >
                  {adminTeams.map((team) => (
                    <option key={team.slug} value={team.slug}>
                      {team.name} ({team.company_name})
                    </option>
                  ))}
                </Select>
              </FormControl>

              {/* Admin Selection (Godmode only) */}
              {isGodMode && newReport.teamSlug && (
                <FormControl>
                  <FormLabel>Act as Admin (optional)</FormLabel>
                  <Select
                    value={newReport.asUser}
                    onChange={(e) => setNewReport({ ...newReport, asUser: e.target.value })}
                    placeholder="Use your godmode identity"
                  >
                    {(() => {
                      const selectedTeam = adminTeams.find(t => t.slug === newReport.teamSlug);
                      const company = userCompanies.find(c => c.slug === selectedTeam?.company_slug);
                      return company?.admins?.map((adminEmail) => (
                        <option key={adminEmail} value={adminEmail}>
                          {adminEmail}
                        </option>
                      )) || [];
                    })()}
                  </Select>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Leave empty to create as yourself. Select an admin to impersonate them.
                  </Text>
                </FormControl>
              )}

              {/* Report Name */}
              <FormControl isRequired>
                <FormLabel>Report Name</FormLabel>
                <Input
                  value={newReport.name}
                  onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                  placeholder="e.g., Weekly Sales Report"
                />
              </FormControl>

              {/* URL */}
              <FormControl isRequired>
                <FormLabel>Dashboard URL</FormLabel>
                <Input
                  value={newReport.url}
                  onChange={(e) => setNewReport({ ...newReport, url: e.target.value })}
                  placeholder="https://..."
                />
              </FormControl>

              {/* Questions */}
              <FormControl isRequired>
                <FormLabel>Questions</FormLabel>
                <VStack spacing={2} width="100%" align="stretch">
                  {newReport.questions.map((question, idx) => (
                    <HStack key={idx}>
                      <Input
                        value={question}
                        onChange={(e) => {
                          const updated = [...newReport.questions];
                          updated[idx] = e.target.value;
                          setNewReport({ ...newReport, questions: updated });
                        }}
                        placeholder="Enter a question"
                      />
                      {newReport.questions.length > 1 && (
                        <IconButton
                          aria-label="Remove question"
                          icon={<BiTrash />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => {
                            const updated = newReport.questions.filter((_, i) => i !== idx);
                            setNewReport({ ...newReport, questions: updated });
                          }}
                        />
                      )}
                    </HStack>
                  ))}
                  <Button
                    size="sm"
                    leftIcon={<BiPlus />}
                    onClick={() => setNewReport({ ...newReport, questions: [...newReport.questions, ''] })}
                    variant="outline"
                  >
                    Add Question
                  </Button>
                </VStack>
              </FormControl>

              {/* Schedule */}
              <FormControl isRequired>
                <FormLabel>Schedule</FormLabel>
                <Select
                  value={newReport.schedule}
                  onChange={(e) => setNewReport({ ...newReport, schedule: e.target.value })}
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormControl>

              {/* Emails */}
              <FormControl isRequired>
                <FormLabel>Recipients</FormLabel>
                <VStack spacing={2} width="100%" align="stretch">
                  {newReport.emails.map((email, idx) => (
                    <HStack key={idx}>
                      <Input
                        value={email}
                        onChange={(e) => {
                          const updated = [...newReport.emails];
                          updated[idx] = e.target.value;
                          setNewReport({ ...newReport, emails: updated });
                        }}
                        placeholder="email@example.com"
                        type="email"
                      />
                      {newReport.emails.length > 1 && (
                        <IconButton
                          aria-label="Remove email"
                          icon={<BiTrash />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => {
                            const updated = newReport.emails.filter((_, i) => i !== idx);
                            setNewReport({ ...newReport, emails: updated });
                          }}
                        />
                      )}
                    </HStack>
                  ))}
                  <Button
                    size="sm"
                    leftIcon={<BiPlus />}
                    onClick={() => setNewReport({ ...newReport, emails: [...newReport.emails, ''] })}
                    variant="outline"
                  >
                    Add Email
                  </Button>
                </VStack>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="minusxGreen"
              onClick={handleCreateReport}
              isLoading={isCreating}
            >
              Create Report
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};
