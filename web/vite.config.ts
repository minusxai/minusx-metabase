import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'
import path from 'path'
import child_process from 'child_process'
import { visualizer } from 'rollup-plugin-visualizer'

export default ({ mode }) => {
  const loadedEnv = loadEnv(
    mode,
    path.resolve(__dirname),
    ['']
  );
  // Only explicitly public application configuration belongs in the bundle.
  const publicKeys = ["ASSETS_PATH", "ATLAS_PATH", "AUTH_PATH", "BASE_SERVER_URL", "DEEPRESEARCH_PATH", "IS_PROD", "LOGGING_PATH", "PLANNER_PATH", "POSTHOG_API_KEY", "POSTHOG_CONFIGS", "SEMANTIC_PATH", "SERVER_PATH", "SOCKET_ENDPOINT", "WEB_CSS_CONFIG_PATH", "WEB_JSON_CONFIG_PATH", "WEB_URL"];
  const env = Object.fromEntries(publicKeys.filter(key => key in loadedEnv).map(key => [key, loadedEnv[key]]));
  env.NODE_ENV = mode
  env.GIT_COMMIT_ID = process.env.GIT_COMMIT_ID || child_process.execSync('git rev-parse --short HEAD').toString().trim()
  env.npm_package_version = process.env.npm_package_version || ''
  return defineConfig({
    plugins: [
      react(),
      ...(mode === 'production' ? [visualizer({
        filename: 'web-build/bundle-analysis.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      })] : [])
    ],
    assetsInclude: ['**/*.md'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env
    },
    server: {
      port: 3005,
    },
    build: {
      outDir: path.resolve(__dirname, './web-build'),
      emptyOutDir: true,
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            'monaco-editor': ['monaco-editor', '@monaco-editor/react', 'monaco-yaml'],
            'react-vendor': ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
            'ui-vendor': ['@chakra-ui/react', '@chakra-ui/icons', '@emotion/react', '@emotion/styled', 'framer-motion'],
            'utility-vendor': ['lodash', 'axios', 'query-string'],
            'apps-vendor': ['apps']
          }
        }
      }
    },
    root: path.resolve(__dirname, 'src/app'), // Set the root to your app directory
    publicDir: path.resolve(__dirname, 'public'), // Set the public directory to your public directory
  })
}
