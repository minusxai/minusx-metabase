export interface Coordinates {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function startSelection(
  onComplete: (coordinates?: Coordinates) => void,
  onDrag: (coordinates?: Coordinates) => void
) {
  let isSelecting = false
  let startX = 0
  let startY = 0
  let rectangle: HTMLDivElement | null = null
  let overlay: HTMLDivElement | null = null
  overlay = document.createElement('div')
  overlay.style.position = 'fixed'
  overlay.style.top = '0'
  overlay.style.left = '0'
  overlay.style.width = '100%'
  overlay.style.height = '100%'
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  overlay.style.zIndex = '9998'
  document.body.appendChild(overlay)
  document.body.style.cursor = 'crosshair'

  function handleMouseDown(event: MouseEvent) {
    console.log('mousedown')
    isSelecting = true
    startX = event.clientX
    startY = event.clientY
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', finishSelection)
  }

  function handleMouseMove(event: MouseEvent) {
    drawRectangle(event)
    if (rectangle) {
      onDrag(getCoordinates())
    }
  }

  function drawRectangle(event: MouseEvent) {
    if (!isSelecting) return

    if (!rectangle) {
      rectangle = document.createElement('div')
      rectangle.style.position = 'fixed'
      rectangle.style.border = '2px dotted #fff'
      rectangle.style.zIndex = '9999'
      document.body.appendChild(rectangle)
    }

    const width = event.clientX - startX
    const height = event.clientY - startY
    rectangle.style.left = `${Math.min(startX, event.clientX)}px`
    rectangle.style.top = `${Math.min(startY, event.clientY)}px`
    rectangle.style.width = `${Math.abs(width)}px`
    rectangle.style.height = `${Math.abs(height)}px`

    if (overlay) {
      const clipPath = `polygon(0% 0%, 0% 100%, ${rectangle.style.left} 100%, ${
        rectangle.style.left
      } ${rectangle.style.top}, ${
        parseInt(rectangle.style.left) + parseInt(rectangle.style.width)
      }px ${rectangle.style.top}, ${
        parseInt(rectangle.style.left) + parseInt(rectangle.style.width)
      }px ${
        parseInt(rectangle.style.top) + parseInt(rectangle.style.height)
      }px, ${rectangle.style.left} ${
        parseInt(rectangle.style.top) + parseInt(rectangle.style.height)
      }px, ${rectangle.style.left} 100%, 100% 100%, 100% 0%)`
      overlay.style.clipPath = clipPath
    }
  }

  function getCoordinates() {
    if (rectangle){
      const x1 = parseInt(rectangle.style.left)
      const y1 = parseInt(rectangle.style.top)
      const x2 = x1 + parseInt(rectangle.style.width)
      const y2 = y1 + parseInt(rectangle.style.height)
      return { x1, y1, x2, y2 }
    }
  }

  function finishSelection() {
    console.log('mouseup')
    if (!isSelecting || !rectangle) return

    const coordinates = getCoordinates()

    console.log('Selection:', coordinates)
    complete(coordinates)
  }

  function cancelSelection(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      complete()
    }
  }

  function complete(coordinates?: Coordinates) {
    console.log('complete')
    isSelecting = false
    document.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', finishSelection)
    document.removeEventListener('keydown', cancelSelection)
    if (rectangle) {
      rectangle.remove()
      rectangle = null
    }
    if (overlay) {
      overlay.remove()
      overlay = null
    }
    document.body.style.cursor = 'default'
    onComplete(coordinates)
  }

  document.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('keydown', cancelSelection)
}
