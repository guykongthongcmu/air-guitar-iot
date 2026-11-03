import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'node:fs';
import path from 'node:path';

const dataFile = path.resolve('data/training.json');

const diskData = () => ({
  name: 'disk-data',
  configureServer(server) {
    server.middlewares.use('/api/data', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST') {
        let body = '';
        req.on('data', c => (body += c));
        req.on('end', () => {
          try {
            JSON.parse(body);
            fs.mkdirSync(path.dirname(dataFile), { recursive: true });
            fs.writeFileSync(dataFile, body);
            res.end('{"ok":true}');
          } catch {
            res.statusCode = 400;
            res.end('{"ok":false}');
          }
        });
      } else if (fs.existsSync(dataFile)) {
        res.end(fs.readFileSync(dataFile));
      } else {
        res.statusCode = 404;
        res.end('{}');
      }
    });
  },
});

export default defineConfig({
  plugins: [vue(), diskData()],
  server: { port: 5173 },
});
