const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..'); // becelo-site/
const RESULTS_HTML = path.join(ROOT, 'results.html');
const STYLE_CSS = path.join(ROOT, 'assets', 'style.css');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const PORT = 8901;

const BADGE_MOBILE_RE = /\.hero-corner-badge\{position:absolute;top:(\d+)px;right:(\d+)px;width:(\d+)px;height:auto;/;
const BADGE_DESKTOP_RE = /\.hero-corner-badge\{width:(\d+)px;top:(\d+)px;right:(\d+)px;\}/;

function readStyle() {
  return fs.readFileSync(STYLE_CSS, 'utf8');
}

function parseBadge() {
  const css = readStyle();
  const m1 = css.match(BADGE_MOBILE_RE);
  const m2 = css.match(BADGE_DESKTOP_RE);
  if (!m1 || !m2) throw new Error('badge rules not found');
  return {
    mobile: { top: +m1[1], right: +m1[2], width: +m1[3] },
    desktop: { width: +m2[1], top: +m2[2], right: +m2[3] },
  };
}

function saveBadge({ mobile, desktop }) {
  let css = readStyle();
  css = css.replace(BADGE_MOBILE_RE,
    `.hero-corner-badge{position:absolute;top:${mobile.top}px;right:${mobile.right}px;width:${mobile.width}px;height:auto;`);
  css = css.replace(BADGE_DESKTOP_RE,
    `.hero-corner-badge{width:${desktop.width}px;top:${desktop.top}px;right:${desktop.right}px;}`);
  fs.writeFileSync(STYLE_CSS, css, 'utf8');
}

const FIG_RE = /<figure class="gf (s\d)"><img src="assets\/images\/([^"]+)" loading="lazy" alt="([^"]*)"><figcaption><b>([^<]*)<\/b><span>([^<]*)<\/span><\/figcaption><\/figure>/g;

function readResults() {
  return fs.readFileSync(RESULTS_HTML, 'utf8');
}

function parseGallery(html) {
  const items = [];
  let m;
  FIG_RE.lastIndex = 0;
  while ((m = FIG_RE.exec(html)) !== null) {
    items.push({ span: m[1], file: m[2], alt: m[3], title: m[4], tag: m[5] });
  }
  return items;
}

function buildFigureLine(it) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `      <figure class="gf ${esc(it.span)}"><img src="assets/images/${esc(it.file)}" loading="lazy" alt="${esc(it.alt)}"><figcaption><b>${esc(it.title)}</b><span>${esc(it.tag)}</span></figcaption></figure>`;
}

function saveGallery(items) {
  const html = readResults();
  const startTag = '<div class="gstrip">';
  const endTag = '</div>\n  <p class="ghint">';
  const startIdx = html.indexOf(startTag);
  const endIdx = html.indexOf(endTag, startIdx);
  if (startIdx === -1 || endIdx === -1) throw new Error('gstrip block not found');
  const before = html.slice(0, startIdx + startTag.length);
  const after = html.slice(endIdx); // starts with "</div>\n  <p class=\"ghint\">"
  const figuresBlock = '\n' + items.map(buildFigureLine).join('\n') + '\n  ';
  const newHtml = before + figuresBlock + after;
  fs.writeFileSync(RESULTS_HTML, newHtml, 'utf8');
}

function listUnusedImages(currentFiles) {
  const used = new Set(currentFiles);
  let files = [];
  try {
    files = fs.readdirSync(IMAGES_DIR).filter(f => /^gal-.*\.(png|jpg|jpeg)$/i.test(f) && !used.has(f));
  } catch (e) {}
  return files;
}

function gitPublish() {
  const opts = { cwd: ROOT, stdio: 'pipe' };
  execSync('git add -A', opts);
  try {
    execSync('git commit -m "Update gallery layout via editor"', opts);
  } catch (e) {
    // nothing to commit is fine
    if (!/nothing to commit/i.test(e.stdout ? e.stdout.toString() : '')) {
      // still try push in case there are staged-but-uncommitted issues; otherwise rethrow later
    }
  }
  const out = execSync('git push', opts);
  return out.toString();
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(u.pathname);

  if (pathname === '/api/gallery' && req.method === 'GET') {
    try {
      const items = parseGallery(readResults());
      const unused = listUnusedImages(items.map(i => i.file));
      send(res, 200, JSON.stringify({ items, unused }));
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (pathname === '/api/badge' && req.method === 'GET') {
    try {
      send(res, 200, JSON.stringify(parseBadge()));
    } catch (e) {
      send(res, 500, JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (pathname === '/api/save-badge' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { mobile, desktop, publish } = JSON.parse(body);
        saveBadge({ mobile, desktop });
        let pushLog = null;
        if (publish) {
          const opts = { cwd: ROOT, stdio: 'pipe' };
          execSync('git add -A', opts);
          try { execSync('git commit -m "Update hero badge size via editor"', opts); } catch (e) {}
          pushLog = execSync('git push', opts).toString();
        }
        send(res, 200, JSON.stringify({ ok: true, pushed: !!publish, pushLog }));
      } catch (e) {
        send(res, 500, JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const { items, publish } = JSON.parse(body);
        if (!Array.isArray(items) || items.length === 0) throw new Error('empty items');
        saveGallery(items);
        let pushLog = null;
        if (publish) {
          pushLog = gitPublish();
        }
        send(res, 200, JSON.stringify({ ok: true, pushed: !!publish, pushLog }));
      } catch (e) {
        send(res, 500, JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // static file serving: /site/* -> becelo-site root, everything else -> editor/ dir
  let filePath;
  if (pathname.startsWith('/site/')) {
    filePath = path.join(ROOT, pathname.slice('/site/'.length));
  } else if (pathname === '/' || pathname === '') {
    filePath = path.join(__dirname, 'index.html');
  } else {
    filePath = path.join(__dirname, pathname);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { send(res, 404, 'not found', 'text/plain'); return; }
    const ext = path.extname(filePath);
    send(res, 200, data, MIME[ext] || 'application/octet-stream');
  });
});

server.listen(PORT, () => console.log('Gallery editor running at http://localhost:' + PORT));
