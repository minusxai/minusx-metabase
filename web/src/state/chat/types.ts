import { Subset } from '../../helpers/utils'

export type Base64URL = string
export type ImageType = 'BASE64' | 'EXTERNAL'

// Image types
export interface ImageContext {
  text: string
}

export interface Base64Image {
  url: Base64URL
  type: Subset<ImageType, 'BASE64'>
  width: number
  height: number
  context: ImageContext
}

export type Image = Base64Image

export type ChatMessageContentType = 'BLANK' | 'DEFAULT' | 'ACTIONS' | 'LUCKY'

// Message Type: DEFAULT
export interface BlankMessageContent {
  type: Subset<ChatMessageContentType, 'BLANK'>
  content?: string
}

// Message Type: DEFAULT
export interface DefaultMessageContent {
  type: Subset<ChatMessageContentType, 'DEFAULT'>
  images: Image[]
  text: string
}

// Message Type: LUCKY
export interface LuckyMessageContent {
  type: Subset<ChatMessageContentType, 'LUCKY'>
  images: Image[]
  text: string
}
