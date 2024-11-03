import { Textarea, TextareaProps, Box } from '@chakra-ui/react';
import ResizeTextarea from 'react-textarea-autosize';
import React from 'react';

const AutosizeTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => {
    return (
      <Box
        maxHeight={500}
        position="relative"
        _focusWithin={{
          borderColor: 'minusxGreen.600',
          borderWidth: '1px',
          borderRadius: 'lg',
        }}
        border='1px solid #ddd'
        borderRadius='lg'
      >
        <Textarea
          minH="unset"
          overflow="auto"
          w="100%"
          resize="none"
          ref={ref}
          minRows={3}
          maxHeight={450}
          as={ResizeTextarea}
          _focus={{
            border: '0px solid #ddd',
            boxShadow: 'none',
          }}
          border='0px'
          {...props}
        />
        <Box
          height="50px"
          pointerEvents="none"
        />
      </Box>
    );
  }
);

export default AutosizeTextarea;
