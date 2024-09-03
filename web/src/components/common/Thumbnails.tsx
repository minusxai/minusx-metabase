import {
  Box,
  HStack,
  Icon,
  IconButton,
  Image as ImageComponent,
} from '@chakra-ui/react'
import React from 'react-redux'
import { BsX } from "react-icons/bs";
import _ from 'lodash'
import { dispatch } from '../../state/dispatch'
import { removeThumbnail } from '../../state/thumbnails/reducer'
import { Image } from '../../state/chat/reducer'

export const Thumbnails: React.FC<{thumbnails: Image[]}> = ({ thumbnails }) => {
  if (!thumbnails) {
    return null;
  }
  if (thumbnails.length == 0) {
    return null
  }
  const ThumbnailComponents = thumbnails.map(({url}, index: number) => {
    return (
      <Box key={index} backgroundColor={"minusxBW.500"} borderRadius={5} position={"relative"}>
        <IconButton
          isRound={true}
          onClick={() => dispatch(removeThumbnail(index))}
          variant="solid"
          colorScheme="minusxGreen"
          aria-label="Refresh"
          size={'xs'}
          icon={<Icon as={BsX} boxSize={5} />}
          position={"absolute"}
          top={0}
          right={0}
        />
        <ImageComponent src={url} height={"100px"} width={"100px"} objectFit={"contain"}/>
      </Box>
    )
  })
  return (
    <HStack>
      {ThumbnailComponents}
    </HStack>
  )
}
