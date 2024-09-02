import React from 'react';
import { Box, VStack, Text, Stack, RadioGroup, Button,
  HStack, Radio, Textarea } from '@chakra-ui/react';
import { uploadState } from '../../state/dispatch';
import { BiCloudDownload, BiCloudUpload } from "react-icons/bi";
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';


export const Testing: React.FC<null> = () => {
  const rootState = useSelector((state: RootState) => state)
  
  const downloadState = () => {
    const stateString = JSON.stringify(rootState, null, 2)
    const blob = new Blob([stateString], {type: "application/json"})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'state.json'
    a.click()
    a.remove()
  }
  
  const uploadJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader()
    const file = event.target.files?.[0]
    
    if (!file) {
      console.error('No file selected')
      return;
    }
    fileReader.readAsText(file, "UTF-8")
    fileReader.onload = (e: ProgressEvent<FileReader>): void => {
      if (e.target?.result) {
        try {
          const content = JSON.parse(e.target.result as string);
          console.log('Uploading state', content);
          uploadState(content);
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      }
    };
  };

  return (
    <Box>
        <Text fontSize="lg" fontWeight="bold">Testing Tools</Text>
        <Box mt={4} backgroundColor="minusxBW.300" p={2} borderRadius={5}>
          <HStack alignItems={"center"} marginTop={0} justifyContent={"space-between"}>
            <Text fontSize="sm">Redux State</Text>
            <HStack>
              <Button size={"xs"} onClick={downloadState} colorScheme="minusxGreen"><BiCloudDownload size={20}/>Download</Button>
              <Button size={"xs"} onClick={() => document.getElementById('file-input')?.click()} colorScheme="minusxGreen"><BiCloudUpload size={20}/>Upload</Button>
              <input
                id="file-input"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={uploadJson}
              />
            </HStack>
          </HStack>
        </Box>
      </Box>
  )
}