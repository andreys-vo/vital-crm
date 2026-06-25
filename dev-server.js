// Local HTTPS static server for testing vital-crm/index.html as a Zoho CRM
// widget via Zoho's "Test Locally" developer setting, without touching the
// GitHub Pages deployment that the live CRM widget pulls from.
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = process.env.PORT || 5001;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const options = {
  key: fs.readFileSync(path.join(ROOT, '..', 'key.pem')),
  cert: fs.readFileSync(path.join(ROOT, '..', 'cert.pem')),
};

https.createServer(options, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Chrome's Private Network Access check: a public page (Zoho CRM) loading
  // a private/localhost resource must get explicit permission, both on the
  // preflight and the actual response.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`vital-crm dev server running at https://127.0.0.1:${PORT}`);
  console.log(`Point Zoho CRM widget "Test Locally" at https://127.0.0.1:${PORT}/index.html`);
});
