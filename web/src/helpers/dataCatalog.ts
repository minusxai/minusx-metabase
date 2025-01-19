import { setAvailableMeasures, setAvailableDimensions, setAvailableLayers } from '../state/semantic-layer/reducer'
import { setSemanticLayer } from '../state/thumbnails/reducer'
import { configs } from '../constants'
import axios from 'axios'
import { dispatch } from "../state/dispatch"

const SEMANTIC_PROPERTIES_API = `${configs.SEMANTIC_BASE_URL}/properties`
const SEMANTIC_LAYERS_API = `${configs.SEMANTIC_BASE_URL}/layers`

export const fetchLayer = async (layer: any) => {
  const measures = []
  const dimensions = []
  let semanticLayerTemp = null
  if (layer) {
    semanticLayerTemp = layer.value
    const response = await axios.get(SEMANTIC_PROPERTIES_API, {
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        layer: semanticLayerTemp
      }
    })
    const data = await response.data
    measures.push(...data.measures)
    dimensions.push(...data.dimensions)
  }
  dispatch(setSemanticLayer(semanticLayerTemp))
  dispatch(setAvailableMeasures(measures))
  dispatch(setAvailableDimensions(dimensions))

}

const fetchData = async (semanticLayer: string) => {
  const response = await axios.get(SEMANTIC_LAYERS_API, {
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const data = await response.data
  dispatch(setAvailableLayers(data.layers || []))
  if (semanticLayer === ''){
    fetchLayer({'value': data.layers[0].name})
  }
}
const MAX_TRIES = 3
export const tryFetchingSemanticLayer = async (semanticLayer: string, tries: number = 1) => {
if (tries <= MAX_TRIES) {
  try {
    await fetchData(semanticLayer)
  } catch (err) {
    console.warn(`Failed to retrieve semantic properties, try ${tries}`, err)
    setTimeout(() => tryFetchingSemanticLayer(semanticLayer, tries + 1), 1000*tries)
  }
}
}