import { RPCs } from "web"

type Callback = (d: any) => void
const listeners: Record<number, Callback> = {}

export const subscribeMB = async (path: string, callback: Callback) => {
    const id = await RPCs.subscribeMetabaseState(path)
    console.log('Subscribed to Metabase state path:', path, 'with ID:', id)
    listeners[id] = callback
    return id
}

export const onMBSubscription = (payload: { id: number; path: string; value: any }) => {
    console.log('Metabase state change', payload)
    const { id } = payload
    if (!(id in listeners)) {
        return
    }
    listeners[id](payload)
}