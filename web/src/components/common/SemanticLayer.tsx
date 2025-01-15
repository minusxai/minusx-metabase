// [WIP] This component is a WIP
import { VStack, Text, Textarea, HStack, Button } from "@chakra-ui/react"
import React from "react"

export const SemanticLayer = () => {
  return <VStack justifyContent="start"
  alignItems="stretch"
  flex={1}
  height={'100%'}
  width={"100%"}
  overflow={"scroll"}>
    <Textarea
      marginTop={2}
      value={""}
      onChange={(e) => console.log(e.target.value)}
      placeholder={'SQL: Important query that captures important business information'}
      size="sm"
      _focus={{
        border: '1.5px solid #16a085',
        boxShadow: 'none',
        bg: "#fefefe"
      }}
      border='1px solid #aaa'
      borderRadius='lg'
      bg={"#eee"}
    />
    <Textarea
      value={""}
      onChange={(e) => console.log(e.target.value)}
      placeholder={`Description. What does this query do?`}
      size="sm"
      _focus={{
        border: '1.5px solid #16a085',
        boxShadow: 'none',
        bg: "#fefefe"
      }}
      border='1px solid #aaa'
      borderRadius='lg'
      bg={"#eee"}
    />
    <HStack justify={"space-between"} width={"100%"} alignItems={"center"} pt={2}>
      <HStack spacing={2}>
        <Button size="sm" colorScheme="minusxGreen">Save</Button>
        <Button size="sm" colorScheme="minusxGreen">Reset</Button>
      </HStack>
    </HStack>
  </VStack>
}