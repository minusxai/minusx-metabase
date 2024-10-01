import { createStandaloneToast } from '@chakra-ui/react'
import { getParsedIframeInfo } from '../helpers/origin'
const { ToastContainer, toast: toastRaw } = createStandaloneToast()

type ToastParams = Parameters<typeof toastRaw>[0]
const width = getParsedIframeInfo().width
const toast = (props: ToastParams) => {
    return toastRaw({
        containerStyle: {
            width: `${width}px`
        },
        ...props
    })
}

export {
    ToastContainer,
    toast
}
