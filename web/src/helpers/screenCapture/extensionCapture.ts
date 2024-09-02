import { captureVisibleTab } from '../../app/rpc'
import { Base64Image } from '../../state/chat/reducer'
import { Coordinates } from '../Selection'

type CapturedImage = Pick<Base64Image, "url" | "width" | "height">

export async function capture(coords: Coordinates) : Promise<CapturedImage>{
  const { x1, y1, x2, y2 } = coords
  const dataUrl = await captureVisibleTab()
  console.log('Data url is', dataUrl)
  const img = new Image()
  return await new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const width = x2 - x1
      const height = y2 - y1
      console.log('Width of image', img.width)
      console.log('Width of window', window.innerWidth)

      const scale = img.width / window.innerWidth
    //   canvas.width = img.width * scale
    //   canvas.height = img.height * scale

      const x1Scaled = x1 * scale
      const y1Scaled = y1 * scale
      const widthScaled = width * scale
      const heightScaled = height * scale

      canvas.width = width
      canvas.height = height

    //   ctx.drawImage(img, x1, y1, width, height, 0, 0, width, height)
      ctx?.drawImage(
        img,
        x1Scaled,
        y1Scaled,
        widthScaled,
        heightScaled,
        0,
        0,
        canvas.width,
        canvas.height
      )
      const croppedDataUrl = canvas.toDataURL('image/png')
      console.log(croppedDataUrl) // Output the base64 data URL
      resolve({
        url: croppedDataUrl,
        width: canvas.width,
        height: canvas.height,
      })
    }
    img.src = dataUrl
  })
}
