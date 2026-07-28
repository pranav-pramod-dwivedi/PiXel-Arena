const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_PORT = parseInt(process.argv[2], 10) || 5500;
const ASSETS_DIR = path.join(__dirname, 'app', 'src', 'main', 'assets');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  if (urlPath === '/' || urlPath.endsWith('/')) {
    urlPath = urlPath === '/' ? '/index.html' : urlPath + 'index.html';
  }

  let filePath = path.join(ASSETS_DIR, urlPath);

  filePath = path.normalize(filePath);

  if (!filePath.startsWith(ASSETS_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  serveFile(res, filePath);
});

const localIP = getLocalIP();

function tryListen(port) {
  server.listen(port, '0.0.0.0');
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      tryListen(port + 1);
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
  server.on('listening', () => {
    const addr = server.address();
    console.log('');
    console.log('  \x1b[36mPiXel Arena Dev Server\x1b[0m');
    console.log('');
    console.log('  \x1b[2mLocal:\x1b[0m    http://localhost:' + addr.port);
    console.log('  \x1b[2mNetwork:\x1b[0m  http://' + localIP + ':' + addr.port);
    console.log('');
    console.log('  \x1b[2mOpen this on your device or emulator for Google Sign-In\x1b[0m');
    console.log('');
  });
}

tryListen(BASE_PORT);
