import { createStandaloneToast } from '@chakra-ui/react'
const { ToastContainer, toast: toastRaw } = createStandaloneToast()

type ToastParams = Parameters<typeof toastRaw>[0]
const toast = (props: ToastParams) => {
    return toastRaw({
        containerStyle: {
            width: '300px'
        },
        ...props
    })
}

export {
    ToastContainer,
    toast
}
