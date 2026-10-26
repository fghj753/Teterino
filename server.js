'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, ''); // например https://example.ru
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8'
};
const SECURITY = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({ 'Content-Type': type || 'text/plain; charset=utf-8' }, SECURITY, extra || {}));
  res.end(body);
}
function json(res, status, obj) { send(res, status, JSON.stringify(obj), MIME['.json'], { 'Cache-Control': 'no-store' }); }

function indexHtml() {
  let html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const seo = SITE_URL ? `<link rel="canonical" href="${SITE_URL}/">\n<meta property="og:url" content="${SITE_URL}/">` : '';
  return html.replace('<!--SEO-->', seo);
}

function serveStatic(req, res, pathname) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return send(res, 400, 'Некорректный адрес'); }
  if (rel.includes('\0')) return send(res, 400, 'Некорректный адрес');
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, 'Страница не найдена');
  if (path.basename(file).startsWith('.')) return send(res, 404, 'Страница не найдена');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    if (path.basename(file) === 'index.html') {
      const body = indexHtml();
      return send(res, 200, req.method === 'HEAD' ? '' : body, type, { 'Cache-Control': 'no-cache' });
    }
    const cache = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, Object.assign({ 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache }, SECURITY));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

function notFound(res) {
  const page = path.join(PUBLIC_DIR, '404.html');
  fs.readFile(page, (err, buf) => send(res, 404, err ? 'Страница не найдена' : buf, err ? undefined : MIME['.html']));
}

const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Метод не поддерживается', undefined, { Allow: 'GET, HEAD' });
    if (p === '/robots.txt') return send(res, 200, `User-agent: *\nAllow: /\n${SITE_URL ? `Sitemap: ${SITE_URL}/sitemap.xml\n` : ''}`);
    if (p === '/sitemap.xml') {
      const body = SITE_URL
        ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc></url>\n</urlset>\n`
        : `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`;
      return send(res, 200, body, MIME['.xml']);
    }
    serveStatic(req, res, p);
  } catch (e) {
    console.error(e);
    send(res, 500, 'Внутренняя ошибка сервера');
  }
});
server.listen(PORT, HOST, () => console.log(`Сайт запущен: http://localhost:${PORT}`));
