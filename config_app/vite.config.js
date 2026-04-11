import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': resolve(repoRoot, 'shared'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // Mock fallback for dev when no backend exists
        bypass: (req, res, proxyOptions) => {
          if (process.env.VITE_MOCK_API === 'true') {
            if (req.url === '/api/command' && req.method === 'POST') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              // Parse body to check command
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                try {
                  const cmd = JSON.parse(body);
                  if (cmd.cmd === 'ping') {
                    res.end(JSON.stringify({ ok: true, version: 'dev-mock' }));
                  } else if (cmd.cmd === 'list_devices') {
                    res.end(JSON.stringify({ ok: true, devices: {} }));
                  } else {
                    res.end(JSON.stringify({ ok: false, error: 'unknown_command' }));
                  }
                } catch {
                  res.end(JSON.stringify({ ok: false, error: 'invalid_json' }));
                }
              });
              return true; // bypass proxy
            }
          }
          return null; // continue to proxy
        }
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        lite: resolve(__dirname, 'lite.html'),
      },
      output: {
        manualChunks: {
          three: ['three'],
          'react-three': ['@react-three/fiber', '@react-three/drei']
        }
      }
    }
  }
})
