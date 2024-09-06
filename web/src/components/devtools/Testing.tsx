import React from 'react';
import {
  Box, VStack, Text, Stack, RadioGroup, Button,
  HStack, Radio, Textarea, Input
} from '@chakra-ui/react';
import { uploadState } from '../../state/dispatch';
import { BiCloudDownload, BiCloudUpload } from "react-icons/bi";
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { fetchData } from '../../app/rpc';
import { HttpMethod } from 'extension/types';
import ReactJson from 'react-json-view';
import { forwardToTab } from '../../app/rpc';

const jsonStyle = {fontSize: "12px", lineHeight: 1, marginTop: "10px"}

export const Testing: React.FC<null> = () => {
  const rootState = useSelector((state: RootState) => state)
  const [apiEndpoint, setApiEndpoint] = React.useState<string>('')
  const [apiMethod, setApiMethod] = React.useState<string>('GET')
  const [apiBody, setApiBody] = React.useState<object>({})
  const [text, setText] = React.useState("generate a random number and tell me what it is")
  const [jupyterResponse, setJupyterResponse] = React.useState("")

  const downloadState = () => {
    const stateString = JSON.stringify(rootState, null, 2)
    const blob = new Blob([stateString], { type: "application/json" })
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

  async function debugAPI(endpoint: string, method: HttpMethod) {
    let response
    try {
      response = await fetchData(endpoint, method);
    } catch {}
    if (response) {
      setApiBody(response)
    } else {
      setApiBody({})
    }
  }

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
      <Text fontSize="lg" fontWeight="bold">Debug API</Text>
      <HStack>
        <Input placeholder="Enter API endpoint" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} />
        <Input placeholder="Enter Method" value={apiMethod} onChange={(e) => setApiMethod(e.target.value)} />
      </HStack>
      <Button onClick={() => debugAPI(apiEndpoint, 'GET')} colorScheme="minusxGreen">GET</Button>
      <ReactJson src={apiBody} collapsed={0}  style={jsonStyle}/>
        <VStack alignItems={"stretch"}>
          <HStack alignItems={"center"} marginTop={0} justifyContent={"space-between"}>
            <Text fontSize="sm">Redux State</Text>
            <HStack>
              <Button size={"xs"} onClick={downloadState} colorScheme="minusxGreen"><BiCloudDownload size={20} />Download</Button>
              <Button size={"xs"} onClick={() => document.getElementById('file-input')?.click()} colorScheme="minusxGreen"><BiCloudUpload size={20} />Upload</Button>
              <input
                id="file-input"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={uploadJson}
              />
            </HStack>
          </HStack>
          <HStack alignItems={"center"} marginTop={0} justifyContent={"space-between"}>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} />
            <VStack>
              <Button size={"xs"} onClick={() => forwardToTab("jupyter", text).then(res => {
                setJupyterResponse(String((res as any)?.response))
              })} colorScheme="minusxGreen">Call Jupyter</Button>
              <span>{jupyterResponse}</span>
            </VStack>
          </HStack>
        </VStack>
      </Box>
  )
}