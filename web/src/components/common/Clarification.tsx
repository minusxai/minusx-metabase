import {
  Box,
  Button,
  HStack,
  VStack,
  Icon,
  IconButton,
  Text,
  Radio,
  RadioGroup,
  Input,
  Stack,
} from '@chakra-ui/react'
import React, { useState, useEffect } from 'react'
import { BsX, BsCheck } from "react-icons/bs"
import { dispatch } from '../../state/dispatch'
import { setClarificationAnswer, toggleClarification } from '../../state/chat/reducer'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'

export const Clarification = () => {
  const thread = useSelector((state: RootState) => state.chat.activeThread)
  const activeThread = useSelector((state: RootState) => state.chat.threads[thread])
  const clarification = activeThread.clarification
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string>('0') // Default to first option
  const [customAnswer, setCustomAnswer] = useState('')

  useEffect(() => {
    if (clarification.show && clarification.questions.length > 0) {
      setCurrentQuestionIndex(0)
      setSelectedOption('0') // Default to first option
      setCustomAnswer('')
    }
  }, [clarification.show, clarification.questions])

  if (!clarification.show || clarification.questions.length === 0) return null

  const currentQuestion = clarification.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === clarification.questions.length - 1
  
  // Add standard options: "Figure it out" and custom input
  const allOptions = [
    ...currentQuestion.options,
    "Figure it out!"
  ]

  const handleNext = () => {
    // Determine the answer based on selection
    let answer: string
    const optionIndex = parseInt(selectedOption)
    
    if (optionIndex < allOptions.length) {
      answer = allOptions[optionIndex]
    } else {
      // Custom input option
      answer = customAnswer.trim() || "Figure it out"
    }
    
    // Save the answer
    dispatch(setClarificationAnswer({
      questionIndex: currentQuestionIndex,
      answer
    }))
    
    if (isLastQuestion) {
      // All questions answered, the RPC function will detect completion
      return
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedOption('0') // Reset to first option
      setCustomAnswer('')
    }
  }

  const handleCancel = () => {
    clarification.questions.forEach((_, index) => {
        // For each question from currentQuestionIndex, set the answer to "Figure it out"
        if (index >= currentQuestionIndex) {
            dispatch(setClarificationAnswer({
                questionIndex: index,
                answer: "Figure it out"
            }))
        }
    })
  }

  return (
    <VStack 
      borderRadius={10} 
      bg="minusxBW.300" 
      alignItems="stretch" 
      padding={4}
      spacing={4}
      w={"100%"}
      margin="0 auto"
    >
      <VStack spacing={2} alignItems="stretch">
        <Text 
          fontSize="xs" 
          fontWeight="bold" 
          color="minusxBW.900"
          textAlign="center"
          textTransform={"uppercase"}
        >
          Clarifying Question {currentQuestionIndex + 1} of {clarification.questions.length}
        </Text>
        
        <Text 
          fontSize="md" 
          color="minusxBW.800"
          textAlign="center"
        >
          {currentQuestion.question}
        </Text>
      </VStack>
      
      <Box 
        width="100%" 
        bg="minusxBW.100" 
        borderRadius="md" 
        padding={3}
      >
        <RadioGroup value={selectedOption} onChange={setSelectedOption}>
          <Stack spacing={2}>
            {allOptions.map((option, index) => (
              <Radio 
                key={index} 
                value={index.toString()}
                colorScheme="minusxGreen"
                size="sm"
              >
                <Text fontSize="sm" color="minusxBW.800">{option}</Text>
              </Radio>
            ))}
            <HStack alignItems="flex-start" spacing={2}>
              <Radio 
                value={allOptions.length.toString()}
                colorScheme="minusxGreen"
                size="sm"
                mt={1}
              />
              <VStack alignItems="stretch" spacing={1} flex={1}>
                <Text fontSize="sm" color="minusxBW.800">Other</Text>
                <Input
                  value={customAnswer}
                  onChange={(e) => {
                    setCustomAnswer(e.target.value)
                    setSelectedOption(allOptions.length.toString())
                  }}
                  onFocus={() => setSelectedOption(allOptions.length.toString())}
                  placeholder="Specify the 'Other' option"
                  size="sm"
                  bg="white"
                />
              </VStack>
            </HStack>
          </Stack>
        </RadioGroup>
      </Box>
      
      <HStack spacing={2} width="100%" justify="center">
        <IconButton
          aria-label="Cancel"
          icon={<Icon as={BsX} boxSize={4}/>}
          bg="red.500"
          color="red.100"
          size="sm"
          borderRadius="md"
          w={"30%"}
          _hover={{ bg: "red.400" }}
          onClick={handleCancel}
        />
        <Button
          bg="green.500"
          color="green.100"
          size="sm"
          borderRadius="md"
          w={"70%"}
          _hover={{ bg: "green.400" }}
          onClick={handleNext}
          rightIcon={<Icon as={BsCheck} boxSize={4}/>}
        >
          {isLastQuestion ? 'Submit' : 'Next'}
        </Button>
      </HStack>
    </VStack>
  )
}