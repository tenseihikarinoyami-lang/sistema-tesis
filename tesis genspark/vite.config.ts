import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'

export default defineConfig({
  plugins: [
    devServer({
      entry: 'src/index.tsx',
      exclude: [
        /^\/@.+$/,
        /.*\.(ts|tsx|vue)$/,
        /.*\.(s?css|less)$/,
        /^\/favicon\.ico$/,
        /.*\.(svg|png)$/,
        /^\/src\/.*/,
        /^\/node_modules\/.*/,
      ],
      injectClientScript: false
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [],
    }
  }
})
