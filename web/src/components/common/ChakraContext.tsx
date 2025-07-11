import { ChakraProvider } from '@chakra-ui/react';
import React, { useMemo } from 'react';
import createCache from '@emotion/cache';
import { CacheProvider, css } from '@emotion/react';
import { extendTheme } from '@chakra-ui/react'
import { StyleSheetManager } from 'styled-components';
import isPropValid from '@emotion/is-prop-valid';
import '@fontsource/bebas-neue';
import '@fontsource/inter';

export const theme = extendTheme({
  fonts: {
    heading: `"Bebas Neue", serif`,
  },
  colors: {
    minusxBW: {
      50: '#fafaf9',
      100: '#fafaf9',
      200: '#f5f5f4',
      300: '#e7e5e4',
      400: '#d6d3d1',
      500: '#d6d3d1',
      600: '#44403c',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917',
    },
    minusxGreen: {
      50: "#1abc9c",
      100: "#1abc9c",
      200: "#1abc9c",
      300: "#1abc9c",
      400: "#1abc9c",
      500: "#16a085",
      600: "#16a085",
      700: "#16a085",
      800: "#16a085",
      900: "#16a085",
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "400",
      },
      variants: {
        ghost: (props) => ({
          color: props.colorMode === "dark" ? "minusxGreen.100" : "minusxGreen.800",
          _hover: {
            bg: "minusxGreen.800",
            color: "minusxBW.100",
          },
          _active: {
            bg: "minusxGreen.800",
            color: "minusxBW.100",
          },
        }),
        outline: (props) => ({
          color: "minusxGreen.800",
          borderColor: "minusxGreen.800",
          _hover: {
            bg: "minusxGreen.800",
            color: "minusxBW.100",
          },
          _active: {
            bg: "minusxGreen.800",
            color: "minusxBW.100",
          },
        }),
      },
    },
    Radio: {
      baseStyle: {
        control: {
          bg: "minusxBW.200",
          borderColor: "minusxBW.500",
          _checked: {
            bg: "minusxGreen.800",
            color: "minusxBW.100",
            borderColor: "transparent",
          },
        },
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            borderBottom: "2px solid",
            borderColor: "minusxBW.300",
            fontWeight: "regular",
            mb: 2,
            _selected: {
              fontWeight: "bold",
              borderColor: "minusxGreen.800",
            },
          },
        },
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            borderColor: "minusxBW.600",
            _hover: {
              borderColor: "minusxGreen.800",
            },
          },
        },
      },
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
            borderColor: "minusxBW.600",
            _hover: {
              borderColor: "minusxGreen.800",
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          borderColor: "minusxBW.600",
          _hover: {
            borderColor: "minusxGreen.800",
          },
          _focus: {
            borderColor: "minusxGreen.800",
          },
        },
      },
    },
  },
  styles: {
    global: {
      '.scroll-body, .scroll-body *, .settings-body, .settings-body *': {
        fontFamily: `"Inter", sans-serif`,
      },
      // add ol and ul tstyles. this is a fix for the list rendering the bullets way to the left
      'ol, ul': {
        paddingLeft: '1.5em',
      },
    },
  },
})

const ChakraContext = ({children}) => {
  const emotionCache = useMemo(() => {
    const shadowHost = document.getElementById('scroll-root');
    const shadowRoot = shadowHost?.shadowRoot;
    const styleContainer = shadowRoot?.getElementById('scroll-root-styles');
    return createCache({
      key: 'emotion-css-cache',
      container: styleContainer,
      prepend: true, // ensures styles are prepended to the <head>, instead of appended
    });
  }, []);
  return (
    <CacheProvider value={emotionCache}>
      <StyleSheetManager shouldForwardProp={isPropValid}>
        <ChakraProvider theme={theme}>
          {children}
        </ChakraProvider>
      </StyleSheetManager>
    </CacheProvider>
  );
};

export default ChakraContext