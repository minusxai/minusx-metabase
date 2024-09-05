import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'
import path from 'path'
import child_process from 'child_process'

export default ({ mode }) => {
  let env = loadEnv(
    mode,
    path.resolve(__dirname),
    ['']
  );
  env.NODE_ENV = mode
  env.GIT_COMMIT_ID = child_process.execSync('git rev-parse --short HEAD').toString().trim()
  env.npm_package_version = process.env.npm_package_version || ''
  return defineConfig({
    plugins: [react()],
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
    },
    root: path.resolve(__dirname, 'src/app'), // Set the root to your app directory
    publicDir: path.resolve(__dirname, 'public'), // Set the public directory to your public directory
  })
}
