import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@generated': resolve(__dirname, 'src/generated'),
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
        bypass: (req: any, res: any) => {
          if (process.env.VITE_MOCK_API !== 'true') {
            return null;
          }

          if (req.url === '/api/command' && req.method === 'POST') {
            res.writeHead(200, { 'Content-Type': 'application/json' });

            let body = '';
            req.on('data', (chunk: Buffer | string) => {
              body += chunk;
            });

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

            return true;
          }

          return null;
        },
      },
    },
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
          'react-three': ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
