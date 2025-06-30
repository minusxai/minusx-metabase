import React, { useState, useCallback } from 'react';
import { VStack, HStack, Text, Button, Box, useToast, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { dispatch } from '../../state/dispatch';
import { setCustomCSS } from '../../state/settings/reducer';
import Editor from '@monaco-editor/react';

const CSSCustomization = () => {
  const customCSS = useSelector((state: RootState) => state.settings.customCSS);
  const [editorValue, setEditorValue] = useState(customCSS);
  const [isApplied, setIsApplied] = useState(true);
  const toast = useToast();

  const handleEditorChange = useCallback((value: string | undefined) => {
    setEditorValue(value || '');
    setIsApplied(false);
  }, []);

  const applyCSS = useCallback(() => {
    try {
      // Basic CSS validation - try to create a style element
      const testStyle = document.createElement('style');
      testStyle.textContent = editorValue;
      document.head.appendChild(testStyle);
      document.head.removeChild(testStyle);

      // If validation passes, save to Redux
      dispatch(setCustomCSS(editorValue));
      setIsApplied(true);
      
      toast({
        title: 'CSS Applied',
        description: 'Your custom CSS has been applied successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'CSS Error',
        description: 'Invalid CSS syntax. Please check your code.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [editorValue, toast]);

  const resetCSS = useCallback(() => {
    setEditorValue('');
    dispatch(setCustomCSS(''));
    setIsApplied(true);
    
    toast({
      title: 'CSS Reset',
      description: 'Custom CSS has been cleared.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  const exportCSS = useCallback(() => {
    if (!editorValue.trim()) {
      toast({
        title: 'Nothing to Export',
        description: 'No CSS content to export.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const blob = new Blob([editorValue], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'minusx-custom-styles.css';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSS Exported',
      description: 'Your CSS has been downloaded.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  }, [editorValue, toast]);

  const importCSS = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.css,text/css';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setEditorValue(content);
          setIsApplied(false);
          
          toast({
            title: 'CSS Imported',
            description: `Loaded ${file.name}. Click "Apply CSS" to use it.`,
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [toast]);

  return (
    <VStack spacing={4} align="stretch" height="100%" p={4}>
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          CSS Customization
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Add custom CSS to modify the appearance of MinusX. Changes apply to the entire application.
        </Text>
      </Box>

      {!isApplied && (
        <Alert status="warning" size="sm">
          <AlertIcon />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>Click "Apply CSS" to save your changes.</AlertDescription>
        </Alert>
      )}

      <Box flex={1} minHeight="400px" border="1px" borderColor="gray.200" borderRadius="md" overflow="hidden">
        <Editor
          height="400px"
          defaultLanguage="css"
          value={editorValue}
          onChange={handleEditorChange}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            smoothScrolling: true,
            cursorStyle: 'line',
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </Box>

      <HStack spacing={3} justify="space-between">
        <HStack spacing={2}>
          <Button 
            colorScheme="blue" 
            onClick={applyCSS}
            isDisabled={isApplied && editorValue === customCSS}
          >
            Apply CSS
          </Button>
          <Button 
            variant="outline" 
            onClick={resetCSS}
            isDisabled={!editorValue.trim()}
          >
            Reset
          </Button>
        </HStack>
        
        <HStack spacing={2}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={importCSS}
          >
            Import
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={exportCSS}
            isDisabled={!editorValue.trim()}
          >
            Export
          </Button>
        </HStack>
      </HStack>

      <Box>
        <Text fontSize="xs" color="gray.500">
          <strong>Tip:</strong> Use browser developer tools to inspect elements and find CSS selectors. 
          Your custom CSS will override existing styles based on CSS specificity rules.
        </Text>
      </Box>
    </VStack>
  );
};

export default CSSCustomization;