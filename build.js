const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
  {
    mangle: false,
    headerIds: false,
  }
);

const CONTENT = './content/posts';
const OUTPUT = './public';
const STATIC = './static';

// Auto-detect BASE from CI environment, else fall back to env var
function getBase() {
  if (process.env.GITHUB_REPOSITORY) {
    const repo = process.env.GITHUB_REPOSITORY; // "username/repo-name"
    const parts = repo.split('/');
    return '/' + parts[1];
  }
  return process.env.BASE_PATH || '';
}
const BASE = getBase();

// Full canonical URL for OG tags — set this to your deployed domain
const SITE_URL = process.env.SITE_URL || 'https://jfullstackdev.github.io';

// ─── HTML escape ───────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Date formatter ────────────────────────────────────

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Slugify heading ──────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, '-and-')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// ─── Extract TOC from markdown (UPDATED: H2 + H3) ─────

function extractToc(content) {
  const headingRegex = /^(##|###)\s+(.+)$/gm;
  const toc = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length; // 2 or 3
    const text = match[2].replace(/\*\*/g, '').trim();
    const slug = slugify(text);

    toc.push({ level, text, slug });
  }

  return toc;
}

// ─── Add IDs to headings in HTML (UPDATED: H2 + H3) ───

function addHeadingIds(html) {
  return html.replace(/<h([23])>(.+?)<\/h\1>/g, (match, level, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\*\*/g, '');
    const id = slugify(cleanText);
    return `<h${level} id="${id}">${text}</h${level}>`;
  });
}

// ─── Layout template ──────────────────────────────────

function page(title, content, description = '', ogType = 'article', canonicalPath = '') {
  const desc = escapeHtml(description) || escapeHtml(title);
  const canonicalUrl = canonicalPath ? `${SITE_URL}${canonicalPath}` : '';
  const ogUrl = canonicalUrl ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${desc}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${desc}">
  ${ogUrl}
  <meta property="og:type" content="${ogType}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${desc}">
  <link rel="stylesheet" href="${BASE}/style.css">
  <link rel="stylesheet" href="${BASE}/hljs.css">
  <script>
    // TOC anchor links — scroll without touching history
    document.addEventListener('click', function(e) {
      var link = e.target.closest('[href^="#"]');
      if (link) {
        e.preventDefault();
        var target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) { target.scrollIntoView(); }
      }
      var topLink = e.target.closest('.back-to-top-link');
      if (topLink) {
        e.preventDefault();
        window.scrollTo(0, 0);
      }
    });
  </script>
</head>
<body>
  ${content}
</body>
</html>`;
}

// ─── Topic helpers ────────────────────────────────────

function slugifyTopic(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .trim();
}

function getTopics(post) {
  const raw = post.frontmatter.topics;
  if (!raw) return [];
  if (typeof raw === 'string') return [raw.trim()];
  if (Array.isArray(raw)) return raw.map(t => t.trim()).filter(Boolean);
  return [];
}

function buildTopicMap(posts) {
  const map = {};
  posts.forEach(post => {
    getTopics(post).forEach(topic => {
      const slug = slugifyTopic(topic);
      if (!map[slug]) map[slug] = { label: topic, posts: [] };
      map[slug].posts.push(post);
    });
  });
  return map;
}

// ─── Parse one markdown file ──────────────────────────

function parsePost(filename) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(CONTENT, filename), 'utf8');
  } catch (err) {
    console.error(`Error reading ${filename}: ${err.message}`);
    process.exit(1);
  }
  const { data, content } = matter(raw);
  const slug = data.slug || filename.replace('.md', '');
  return { frontmatter: data, content, slug };
}

// ─── Clean and create output folder ──────────────────

if (fs.existsSync(OUTPUT)) {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT, { recursive: true });

// ─── Read all, sort by date (newest first) ─────────────

const files = fs.readdirSync(CONTENT).filter(f => f.endsWith('.md'));
const posts = files.map(parsePost);

// Detect slug collisions before sorting
const slugCount = {};
posts.forEach(p => {
  slugCount[p.slug] = (slugCount[p.slug] || 0) + 1;
});
const duplicates = Object.entries(slugCount).filter(([, count]) => count > 1);
if (duplicates.length > 0) {
  console.error('Slug collision detected:', duplicates.map(([slug]) => slug).join(', '));
  process.exit(1);
}

// Validate and warn about missing frontmatter; fall back to built-in defaults
posts.forEach(p => {
  if (!p.frontmatter.date) {
    console.warn(`Warning: "${p.slug}" has no date in frontmatter — using build time`);
  }
  if (!p.frontmatter.description) {
    console.warn(`Warning: "${p.slug}" has no description — excerpt will be used for SEO`);
  }
});

// Sort: frontmatter date || build time, with filename as tiebreaker
posts.sort((a, b) => {
  const dateA = new Date(a.frontmatter.date || Date.now());
  const dateB = new Date(b.frontmatter.date || Date.now());
  return dateB - dateA || a.slug.localeCompare(b.slug);
});

// Set fallback description from first paragraph (160 chars max)
function getFallbackDescription(content) {
  const firstPara = content.replace(/#+\s.+\n?/g, '').trim().split('\n\n')[0] || '';
  if (firstPara.length <= 160) return firstPara;
  return firstPara.slice(0, 157) + '…';
}

// Ensure every post has a description for SEO
posts.forEach(p => {
  if (!p.frontmatter.description) {
    p.frontmatter.description = getFallbackDescription(p.content);
  }
});

// ─── Build topic map (used by index page sidebar) ────

const topicMap = buildTopicMap(posts);
const topicSlugs = Object.keys(topicMap).sort();

// ─── Copy static assets ───────────────────────────────

if (fs.existsSync(STATIC)) {
  fs.cpSync(STATIC, OUTPUT, { recursive: true });
}

// ─── Generate each post page ───────────────────────────

posts.forEach(post => {
  const toc = extractToc(post.content);

  const tocHtml = toc.map(t => `
    <li class="lvl-${t.level}">
      <a href="#${t.slug}">${t.text}</a>
    </li>
  `).join('');

  const renderedContent = addHeadingIds(marked(post.content)).replace(/^<h1>.+<\/h1>\n?/i, '');

  const body = `
    <nav class="top-nav"><a href="${BASE}/" id="back-link">← Back</a></nav>
    <script>
      (function() {
        var a = document.getElementById('back-link');
        a.addEventListener('click', function(e) {
          if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
          if (document.referrer && document.referrer.includes(window.location.hostname)) {
            e.preventDefault();
            history.back();
          }
        });
      })();
    </script>
    <div class="layout">
      <aside class="toc">
        <details class="toc-mobile">
          <summary>Contents</summary>
          <nav><ul>${tocHtml}</ul></nav>
        </details>
        <div class="toc-desktop">
          <h2>Contents</h2>
          <nav><ul>${tocHtml}</ul></nav>
        </div>
      </aside>
      <article class="content">
        <header>
          <h1>${escapeHtml(post.frontmatter.title)}</h1>
          <time>${formatDate(post.frontmatter.date)}</time>
        </header>
        <div>${renderedContent}</div>
        <footer class="back-to-top">
          <a href="#" class="back-to-top-link">← Back to Top</a>
        </footer>
      </article>
    </div>
  `;

  fs.mkdirSync(path.join(OUTPUT, post.slug), { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT, post.slug, 'index.html'),
    page(post.frontmatter.title, body, post.frontmatter.description, 'article', `${BASE}/${post.slug}/`)
  );
});

// ─── Pagination config ───────────────────────────────
const PER_PAGE = 10;

// ─── Generate index page ───────────────────────────────

function paginatePosts(pageNum, totalPages, postsOnPage) {
  const list = postsOnPage
    .map(p => {
      const desc = p.frontmatter.description || '';
      const trimmed = desc.length > 200 ? desc.slice(0, 200) + '…' : desc;
      return `
    <li>
      <a href="${BASE}/${p.slug}/">${escapeHtml(p.frontmatter.title)}</a>
      <time>${formatDate(p.frontmatter.date)}</time>
      <span>${trimmed}</span>
    </li>
  `;
    })
    .join('');

  const prevLink = pageNum > 1
    ? `<a href="${pageNum === 2 ? BASE + '/' : BASE + '/page/' + (pageNum - 1) + '/'}" class="pagination-prev">← Newer</a>`
    : '';
  const nextLink = pageNum < totalPages
    ? `<a href="${BASE}/page/${pageNum + 1}/" class="pagination-next">Older →</a>`
    : '';
  const pageLabel = totalPages > 1
    ? `<span class="pagination-label">Page ${pageNum} of ${totalPages}</span>`
    : '';

  return `
    <nav class="top-nav"><a href="${BASE}/">Writing</a></nav>
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-section">
          <p>@jfullstackdev</p>
          <p>Senior Dev, GitHub Contributor, Google & VEX Robotics Certified Educator, Tech Instructor, LPT</p>
        </div>
      </aside>
      <main class="content">
        ${topicSlugs.length > 0 ? `
        <div class="topic-row">
          ${topicSlugs.map(slug => {
            const { label } = topicMap[slug];
            return `<a href="${BASE}/topics/${slug}/" class="topic-chip">${escapeHtml(label)}</a>`;
          }).join('')}
        </div>
        ` : ''}
        <ul class="post-list">${list}</ul>
        ${(prevLink || nextLink) ? `<div class="pagination">${prevLink}${pageLabel}${nextLink}</div>` : ''}
      </main>
    </div>
  `;
}

const totalPages = Math.ceil(posts.length / PER_PAGE);

for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
  const start = (pageNum - 1) * PER_PAGE;
  const pagePosts = posts.slice(start, start + PER_PAGE);

  if (pageNum === 1) {
    fs.writeFileSync(
      path.join(OUTPUT, 'index.html'),
      page('Writing', paginatePosts(1, totalPages, pagePosts), '', 'website', `${BASE}/`)
    );
  } else {
    fs.mkdirSync(path.join(OUTPUT, 'page', String(pageNum)), { recursive: true });
    fs.writeFileSync(
      path.join(OUTPUT, 'page', String(pageNum), 'index.html'),
      page(`Writing — Page ${pageNum}`, paginatePosts(pageNum, totalPages, pagePosts), '', 'website', `${BASE}/page/${pageNum}/`)
    );
  }
}

// ─── Generate 404 page ─────────────────────────────────

fs.writeFileSync(
  path.join(OUTPUT, '404.html'),
  page('404 - Not Found', `
    <main>
      <h1>404</h1>
      <p>Page not found.</p>
      <a href="${BASE}/">← Go home</a>
    </main>
  `, '', 'website', `${BASE}/404.html`)
);

// ─── Generate topic pages ─────────────────────────────

if (topicSlugs.length > 0) {
  const TOPIC_PER_PAGE = 10;

  topicSlugs.forEach(slug => {
    const { label, posts: tp } = topicMap[slug];
    const tPages = Math.ceil(tp.length / TOPIC_PER_PAGE);

    for (let pn = 1; pn <= tPages; pn++) {
      const start = (pn - 1) * TOPIC_PER_PAGE;
      const slice = tp.slice(start, start + TOPIC_PER_PAGE);

      const list = slice.map(p => {
        const desc = p.frontmatter.description || '';
        const trimmed = desc.length > 200 ? desc.slice(0, 200) + '…' : desc;
        return `
        <li>
          <a href="${BASE}/${p.slug}/">${escapeHtml(p.frontmatter.title)}</a>
          <time>${formatDate(p.frontmatter.date)}</time>
          <span>${trimmed}</span>
        </li>
      `;
      }).join('');

      const prevHref = pn === 2
        ? `${BASE}/topics/${slug}/`
        : `${BASE}/topics/${slug}/page/${pn - 1}/`;
      const tPrev = pn > 1
        ? `<a href="${prevHref}" class="pagination-prev">← Newer</a>`
        : '';
      const tNext = pn < tPages
        ? `<a href="${BASE}/topics/${slug}/page/${pn + 1}/" class="pagination-next">Older →</a>`
        : '';
      const tLabel = tPages > 1
        ? `<span class="pagination-label">Page ${pn} of ${tPages}</span>`
        : '';

      const pageTitle = tPages > 1 ? `${label} — Page ${pn}` : label;

      const dir = pn === 1
        ? path.join(OUTPUT, 'topics', slug)
        : path.join(OUTPUT, 'topics', slug, 'page', String(pn));
      fs.mkdirSync(dir, { recursive: true });

      const outPath = pn === 1
        ? path.join(OUTPUT, 'topics', slug, 'index.html')
        : path.join(OUTPUT, 'topics', slug, 'page', String(pn), 'index.html');

      const topicUrl = pn === 1
        ? `${BASE}/topics/${slug}/`
        : `${BASE}/topics/${slug}/page/${pn}/`;

      fs.writeFileSync(
        outPath,
        page(pageTitle, `
          <nav class="top-nav"><a href="${BASE}/">← Writing</a></nav>
          <div class="layout">
            <main class="content">
              <h1>${label}</h1>
              <ul class="post-list">${list}</ul>
              ${(tPrev || tNext) ? `<div class="pagination">${tPrev}${tLabel}${tNext}</div>` : ''}
            </main>
          </div>
        `, `Articles about ${label}`, 'website', topicUrl)
      );
    }
  });

  console.log(`Built ${posts.length} posts and ${topicSlugs.length} topics.`);
} else {
  console.log(`Built ${posts.length} posts.`);
}
