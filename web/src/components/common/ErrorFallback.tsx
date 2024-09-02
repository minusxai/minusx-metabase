import React, { useState } from 'react';
import { Button, Box, Text, Code, VStack, HStack, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import _ from 'lodash'

interface ErrorFallbackProps {
  error: any;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps): JSX.Element {
  const errors: Array<any> = error ? Array.isArray(error) ? error : [error] : []
  const maxErrorLength = errors.length
  const [currentErrorIndex, setCurrentErrorIndex] = useState(errors.length - 1)
  const currentError = _.get(errors, currentErrorIndex, {message: 'Unknown error'})
  const resetError = () => {
    console.log('Resetting error');
    resetErrorBoundary();
  };
  const gotoPreviousError = () => setCurrentErrorIndex((currentErrorIndex - 1 + maxErrorLength) % maxErrorLength)
  const gotoNextError = () => setCurrentErrorIndex((currentErrorIndex + 1) % maxErrorLength)

  return (
    <VStack role="alert" p={4} borderWidth={1} borderRadius="md" borderColor="red.400" spacing={4} align="stretch">
      <Alert maxWidth="100%" status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center">
        <AlertTitle maxWidth="100%" mt={4} mb={1} fontSize="lg">
          An error occurred
        </AlertTitle>
        <AlertDescription maxWidth="100%">
          <Box overflowX="scroll" overflowY="scroll" textAlign={"left"} maxWidth="100%">
            <Code display="block" whiteSpace="pre" mt={2}>
              {JSON.stringify(currentError, null, 2)}
            </Code>
            <HStack>
              <Button onClick={gotoPreviousError} style={{ marginRight: '10px' }}>Previous</Button>
              <p>Errors ({currentErrorIndex + 1} / {maxErrorLength})</p>
              <Button onClick={gotoNextError}>Next</Button>
            </HStack>
          </Box>
          <Text mt={2} color="red.500">
            {currentError.message}
          </Text>
        </AlertDescription>
      </Alert>
      <HStack>
      <Button onClick={resetError} colorScheme="red">
        Re-Render App
      </Button>
      </HStack>
    </VStack>
  );
}
