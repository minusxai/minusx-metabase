import chat from "../chat/chat";
import { DefaultMessageContent } from '../state/chat/types'
import { getState, RootState } from "../state/store"
import { sleep } from "../helpers/utils"
import _, { isEmpty } from "lodash"
import { getSemanticQuery } from "../helpers/LLM/remote";
import { ChatMessage } from "../state/chat/reducer";
import axios from 'axios'
import { configs } from '../constants'

const SEMANTIC_QUERY_API = configs.SERVER_BASE_URL + "/semantic/sql"

export async function semanticPlanner({text, semanticLayer}: {text: string, semanticLayer: any}) {
  
  const query = await getSemanticQuery(text, semanticLayer)
  const fetchData = async ({queryObj}:{queryObj:any}) => {
    const payload = {
      measures: Array.from(queryObj.measures),
      dimensions: Array.from(queryObj.dimensions),
    }
    const response = await axios.post(SEMANTIC_QUERY_API, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const data = await response.data
    const sqlQuery = data.query
    if (sqlQuery) {
     console.log('Query is', sqlQuery)
    }
  }
  try {
    if (query) {
      fetchData(query)
    }
  } catch (err) {
    console.log('Error is', err)
  }
}