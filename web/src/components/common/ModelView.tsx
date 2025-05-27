import React from 'react';
import { Box } from '@chakra-ui/react';
import { CodeBlock } from './CodeBlock'

interface ModelViewProps {
  yamlContent?: string;
}

export const ModelView: React.FC<ModelViewProps> = ({ yamlContent }) => {
  return (
    <Box w="100%">
      <CodeBlock 
        code={yamlContent || ''} 
        tool="" 
        language="yaml" 
      />
    </Box>
  );
};
