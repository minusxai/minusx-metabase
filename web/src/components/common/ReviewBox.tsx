import React, { useState, useEffect } from 'react'
import {
  VStack,
  HStack,
  Text,
  Button,
  Textarea,
  Link,
  Icon,
  Box,
  useToast,
  IconButton
} from '@chakra-ui/react'
import { BiStar, BiX } from 'react-icons/bi'
import { useSubmitReviewMutation, useGetUserStateQuery } from '../../app/api/userStateApi'
import { useSelector } from 'react-redux'
import { RootState } from '../../state/store'
import _ from 'lodash'

type ReviewState = 'initial' | 'feedback' | 'completed'

export const ReviewBox: React.FC = () => {
  const { data: userState, isLoading: isUserStateLoading } = useGetUserStateQuery(undefined)
  const threads = useSelector((state: RootState) => state.chat.threads)
  const enableReviews = useSelector((state: RootState) => state.settings.enableReviews)
  const [rating, setRating] = useState<number>(0)
  const [comments, setComments] = useState<string>('')
  const [reviewState, setReviewState] = useState<ReviewState>('initial')
  const [isClosed, setIsClosed] = useState<boolean>(false)
  const [wasEverShown, setWasEverShown] = useState<boolean>(false)
  const [submitReview, { isLoading }] = useSubmitReviewMutation()
  const toast = useToast()

  // Get review status once
  const isReviewed = _.get(userState, 'review.is_reviewed', false)
  
  // Check engagement conditions
  const threadCount = Object.keys(threads).length
  const totalUserMessages = Object.values(threads).reduce((total, thread) => {
    return total + thread.messages.filter(msg => msg.role === 'user').length
  }, 0)
  const hasEnoughEngagement = threadCount >= 3 || totalUserMessages > 10
  console.log('ReviewBox engagement check:', hasEnoughEngagement, threadCount, totalUserMessages)

  // Track if component was ever shown when user hadn't reviewed yet
  useEffect(() => {
    if (!isUserStateLoading && userState && !isReviewed && !wasEverShown && hasEnoughEngagement) {
      setWasEverShown(true)
    }
  }, [isUserStateLoading, userState, isReviewed, wasEverShown, hasEnoughEngagement])

  // If user has already reviewed and we're showing the component, set to completed state
  useEffect(() => {
    if (!isUserStateLoading && userState && isReviewed && wasEverShown && reviewState !== 'completed') {
      setReviewState('completed')
    }
  }, [isUserStateLoading, userState, isReviewed, wasEverShown, reviewState])

  // Don't render if feature is disabled
  if (!enableReviews) {
    return null
  }

  // Don't render if still loading, no user state, or manually closed
  // But DO render if wasEverShown is true (even after is_reviewed becomes true)
  console.log('ReviewBox render check:', { isUserStateLoading, userState, isClosed, isReviewed, wasEverShown })
  if (isUserStateLoading || !userState || isClosed) {
    return null
  }

  // Don't show if user already reviewed AND we never showed the component before
  if (isReviewed && !wasEverShown) {
    return null
  }

  // Don't show if user doesn't have enough engagement AND we never showed the component before
  if (!hasEnoughEngagement && !wasEverShown) {
    return null
  }

  const handleStarClick = (starRating: number) => {
    setRating(starRating)
    // If in feedback state and user changes rating, go back to initial state
    if (reviewState === 'feedback') {
      setReviewState('initial')
    }
  }

  const handleRatingSubmit = () => {
    if (rating === 0) {
      toast({
        title: 'Please select a rating',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }
    
    // If 5 stars, submit immediately and show thank you
    if (rating === 5) {
      handleFinalSubmit()
    } else {
      // Ask for feedback for <= 4 stars
      setReviewState('feedback')
    }
  }

  const handleClose = () => {
    // If user has rating or comments, submit them instead of dismissal
    if (rating > 0 || comments.trim()) {
      // Submit current data without waiting for response
      submitReview({ 
        rating: rating > 0 ? rating : 0, 
        comments: comments.trim() || undefined 
      }).unwrap().catch(() => {
        // Silently handle errors since user is closing anyway
      })
    } else {
      // Submit dismissal rating
      submitReview({ rating: 0, comments: undefined }).unwrap().catch(() => {
        // Silently handle errors since user is closing anyway
      })
    }
    
    // Close immediately without waiting for API response
    setIsClosed(true)
  }

  const handleFinalSubmit = () => {
    // Immediately transition to completed state for snappy UI
    setReviewState('completed')
    
    // Submit in background without blocking UI
    submitReview({ rating, comments: comments.trim() || undefined }).unwrap().catch(() => {
      // Silently handle errors in background
      // Could potentially revert state or show subtle notification if needed
    })
  }

  if (reviewState === 'completed') {
    return (
      <Box
        bg="minusxBW.100"
        border="1px solid"
        borderColor="minusxBW.400"
        borderRadius="md"
        p={4}
        mb={2}
        w="100%"
      >
        <VStack spacing={3}>
          <HStack justifyContent="space-between" w="100%">
            <Text fontSize="sm" fontWeight="bold" color="minusxGreen.800" textAlign={'center'}>
              Thank you for your feedback :)
            </Text>
            <IconButton
              aria-label="Close review"
              icon={<Icon as={BiX} />}
              size="xs"
              variant="ghost"
              onClick={handleClose}
            />
          </HStack>
          
          {rating === 5 && (
            <VStack spacing={2}>
              <Text fontSize="xs" textAlign={'center'}>
                If you find MinusX useful, please leave us a review on the &nbsp;
                <Link
                  href="https://chromewebstore.google.com/detail/minusx/ngneijhbpnongpekeimkbjinkkpfkaop"
                  isExternal
                  color="minusxGreen.600"
                  display={'inline'}
                  fontSize="xs"
                  fontWeight="bold"
                  textDecoration="underline"
                >
                  Chrome Web Store. 
                </Link>
                &nbsp; to support our work!
              </Text>
            </VStack>
          )}
        </VStack>
      </Box>
    )
  }

  return (
    <Box
      bg="minusxBW.100"
      border="1px solid"
      borderColor="minusxBW.400"
      borderRadius="md"
      p={4}
      mb={2}
      w="100%"
    >
      <VStack spacing={3}>
        <HStack justifyContent="space-between" w="100%">
          <Text fontSize="sm" fontWeight="bold">
            How helpful do you find MinusX?
          </Text>
          <IconButton
            aria-label="Close review"
            icon={<Icon as={BiX} />}
            size="xs"
            variant="ghost"
            onClick={handleClose}
          />
        </HStack>

        <HStack spacing={0}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Box
              key={star}
              as="button"
              p={1}
              cursor={reviewState === 'initial' || reviewState === 'feedback' ? 'pointer' : 'default'}
              onClick={() => (reviewState === 'initial' || reviewState === 'feedback') && handleStarClick(star)}
              _hover={reviewState === 'initial' || reviewState === 'feedback' ? { transform: 'scale(1.1)' } : {}}
              transition="transform 0.1s"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Icon
                as={BiStar}
                boxSize={6}
                color={star <= rating ? 'minusxGreen.500' : 'minusxGreen.300'}
                fill={star <= rating ? 'minusxGreen.500' : 'transparent'}
                stroke={star <= rating ? 'minusxGreen.500' : 'minusxGreen.300'}
                strokeWidth={1.5}
              />
            </Box>
          ))}
        </HStack>

        {reviewState === 'feedback' && (
          <VStack spacing={2} w="100%">
            <HStack justifyContent="space-between" w="100%">
              <Text fontSize="xs" color="minusxBW.600">
                What could we do better?
              </Text>
            </HStack>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Optional, but this could really help us!"
              size="sm"
              resize="none"
              rows={2}
              fontSize="xs"
              rounded={5}
            />
            <Button
              colorScheme="minusxGreen"
              size="sm"
              onClick={handleFinalSubmit}
              isLoading={isLoading}
              loadingText="Submitting..."
              w="100%"
            >
              Submit Review
            </Button>
          </VStack>
        )}

        {reviewState === 'initial' && rating > 0 && (
          <Button
            colorScheme="minusxGreen"
            size="sm"
            onClick={handleRatingSubmit}
            w="100%"
          >
            Submit Rating
          </Button>
        )}
      </VStack>
    </Box>
  )
}