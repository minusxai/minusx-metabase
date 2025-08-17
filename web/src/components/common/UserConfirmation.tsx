import {
  HStack,
  VStack,
  Icon,
  Button,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Checkbox,
  Textarea,
  Box,
  Collapse,
} from '@chakra-ui/react'
import { BsX, BsCheck } from "react-icons/bs";
import { dispatch } from '../../state/dispatch'
import { setUserConfirmationInput, toggleUserConfirmation, setUserConfirmationFeedback } from '../../state/chat/reducer'
import { setConfirmChanges } from '../../state/settings/reducer'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import React, { useEffect, useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued';
import { setMinusxMode } from '../../app/rpc';
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import vscDark from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
import { set } from 'lodash';

SyntaxHighlighter.registerLanguage("sql", sql);

const HighlightLine = React.memo(({ code }: { code: string }) => (
  <SyntaxHighlighter
    language="sql"
    style={vscDark}
    PreTag="span"
    CodeTag="span"
    wrapLongLines   // ✅ tells syntax highlighter to break long lines
    customStyle={{
      display: "inline-block",
      background: "transparent",
      margin: 0,
      padding: 0,
      whiteSpace: "pre-wrap", // ✅ allows wrapping
      wordBreak: "break-word" // ✅ avoid horizontal scroll
    }}
  >
    {code ?? " "}
  </SyntaxHighlighter>
));


export const UserConfirmation = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const userConfirmation = activeThread.userConfirmation
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [showRejectFeedback, setShowRejectFeedback] = useState(false)
  const [rejectFeedback, setRejectFeedback] = useState('')


  type VERDICT = 'APPROVE' | 'REJECT' | 'NULL'
  
  useEffect(() => {
    dispatch(setUserConfirmationInput('NULL'))
    dispatch(toggleUserConfirmation({show: false, content: '', contentTitle: '', oldContent: ''}))
  }, []);

  const handleOpen = () => {
    console.log('Modal opening')
    setMinusxMode('open-selection')
    onOpen()
  }

  const handleClose = (verdict: VERDICT) => {
    setMinusxMode('open-sidepanel')
    console.log('Modal closing with verdict:', verdict)
    if ((verdict === 'REJECT') && (rejectFeedback.trim() != '')) {
        dispatch(setUserConfirmationFeedback(rejectFeedback))
    }
    if (dontAskAgain) {
        dispatch(setConfirmChanges(false))
    }
    dispatch(setUserConfirmationInput(verdict))
    setRejectFeedback('')
    setShowRejectFeedback(false)
    setDontAskAgain(false)
    onClose()
  }

  useEffect(() => {
    if (userConfirmation.show && !isOpen) {
      handleOpen()
    } else if (!userConfirmation.show && isOpen) {
      handleClose('REJECT')
    }
  }, [userConfirmation.show, isOpen])

  
  if (!userConfirmation.show) return null

  return (
    <Modal isOpen={isOpen} onClose={() => handleClose('REJECT')} size="6xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent maxW="90vw" h="85vh" bg="minusxBW.200" display="flex" flexDirection="column">
        <ModalHeader pb={3} pt={4} px={6} borderBottom="1px solid" borderColor="minusxBW.400">
          <Text 
            fontSize="lg" 
            fontWeight="semibold" 
            color="minusxBW.800"
          >
            {userConfirmation.contentTitle ?? "Review and confirm changes"}
          </Text>
        </ModalHeader>
        <ModalCloseButton top={4} right={4} onClick={() => handleClose('REJECT')} />
        <ModalBody p={0} display="flex" flexDirection="column" bg="minusxBW.200" overflow="hidden">
          <div style={{ flex: 1, overflow: "auto", padding: "24px", height: "100%" }}>
            <ReactDiffViewer 
              oldValue={userConfirmation.oldContent ?? ''}
              newValue={userConfirmation.content ?? ''}
              splitView={true}
              disableWordDiff={true}
              renderContent={(line: string) => <HighlightLine code={line} />}
              useDarkTheme={true}
              leftTitle={<Text fontSize="sm" color="minusxBW.100" textAlign={"center"}>SQL in the Editor</Text>}
              rightTitle={<Text fontSize="sm" color="minusxBW.100" textAlign={"center"}>SQL to be executed</Text>}
              showDiffOnly={false}
            />
          </div>
          
          <VStack 
            spacing={3} 
            p={4} 
            bg="minusxBW.200" 
            position="sticky"
            bottom={0}
            zIndex={10}
          >
            {/* Don't ask again checkbox */}
            <Checkbox
              isChecked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              size="md"
              color="minusxBW.800"
              borderColor={"minusxGreen.400"}
              fontWeight={600}
            >
              Don't ask for confirmation again
            </Checkbox>
            
            {/* Reject feedback - show when reject is clicked */}
            <Collapse in={showRejectFeedback} animateOpacity style={{ width: '50%' }}>
              <Box w="100%">
                <Text fontSize="sm" color="minusxBW.600" mb={2}>
                  Tell MinusX what it could do differently.
                </Text>
                <Textarea
                  value={rejectFeedback}
                  onChange={(e) => setRejectFeedback(e.target.value)}
                  placeholder="What changes would you like to see?"
                  size="md"
                  rows={4}
                  w="100%"
                  resize="vertical"
                  bg="minusxBW.50"
                  borderColor="minusxBW.300"
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px blue.400"
                  }}
                />
              </Box>
            </Collapse>

            <HStack spacing={3}>
              <Button
                leftIcon={<Icon as={BsX} boxSize={4}/>}
                variant="solid"
                size="md"
                onClick={() => {
                  if (showRejectFeedback) {
                    handleClose('REJECT')
                  } else {
                    setShowRejectFeedback(true)
                  }
                }}
                colorScheme="red"
                minWidth={"120px"}
              >
                {showRejectFeedback ? 'Submit' : 'Reject'}
              </Button>
              
              {showRejectFeedback && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setShowRejectFeedback(false)
                    setRejectFeedback('')
                  }}
                >
                  Cancel
                </Button>
              )}
              
              {!showRejectFeedback && (
                <Button
                  leftIcon={<Icon as={BsCheck} boxSize={4}/>}
                  variant="solid"
                  size="md"
                  onClick={() => handleClose('APPROVE')}
                  colorScheme="teal"
                  minWidth={"120px"}
                >
                  Approve
                </Button>
              )}
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
