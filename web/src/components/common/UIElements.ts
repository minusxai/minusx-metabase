import _ from 'lodash'
import { Coordinates } from '../../helpers/Selection'

export class UIElementSelection {
  oldBorders: Record<string, string>
  uiElements: any
  constructor() {
    // this.uiElements = getUIElements()
    this.uiElements = {}
    this.oldBorders = {}
  }

  select(coordinates?: Coordinates) {
    for (const key in this.uiElements) {
      const nodes = this.uiElements[key]

      // Loop through each node in the array
      nodes.forEach((node, index) => {
        const rect = node.getBoundingClientRect()

        // Check if the node intersects with the given coordinates
        const intersects: boolean = coordinates
          ? !(
              rect.left > coordinates.x2 ||
              rect.right < coordinates.x1 ||
              rect.top > coordinates.y2 ||
              rect.bottom < coordinates.y1
            )
          : false

        const keyPath = `${key},${index}`

        if (intersects) {
          if (!this.oldBorders.hasOwnProperty(keyPath)) {
            this.oldBorders[keyPath] = node.style.border
          }

          // Change the border to a solid 1px red border
          node.style.border = '1px solid red'
        } else {
          // Restore the old border if it was changed previously
          if (this.oldBorders.hasOwnProperty(keyPath)) {
            node.style.border = this.oldBorders[keyPath]
            delete this.oldBorders[keyPath]
          }
        }
      })
    }
  }

  getSelectedNodes() {
    const nodes = []
    for (const key in this.uiElements) {
      this.uiElements[key].forEach((node, index) => {
        const keyPath = `${key},${index}`
        const selected = this.oldBorders.hasOwnProperty(keyPath)
        if (selected) {
          nodes.push({
            node,
            type: key,
            index,
          })
        }
      })
    }
    return nodes
  }

  end() {
    this.select()
  }
}