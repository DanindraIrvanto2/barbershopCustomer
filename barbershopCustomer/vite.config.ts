import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api/midtrans-snap': {
          target: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
          changeOrigin: true,
          rewrite: () => '',
          headers: {
            Authorization: `Basic ${Buffer.from(`${env.MIDTRANS_SERVER_KEY}:`).toString('base64')}`,
          },
        },
      },
    },
  }
})