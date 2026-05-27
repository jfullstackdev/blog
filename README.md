# my blog + mini static generator

A personal blog and a minimal static site generator, all in one repo.
Parses Markdown posts with frontmatter, renders them to HTML pages
with syntax highlighting and table of contents, then deploys
to GitHub Pages via CI.

The posts are mine; the generator code is yours if you want 
to use it. Create from template or fork it, remove my 
content, and have your own blog.

This could be a separate static site generator as a template,
but it's small enough to be an `npm` dependency, hence, I
keep them in one repo.

Another good thing about this is that we have two choices,
either read the blogs in this repo as is, or view the rendered pages.
Either way, enjoy!

## Why This?

Most static site generators (Jekyll, Hugo, Gatsby, Next.js) 
come with a full build system, plugins, themes, and opinions 
baked in. It was too much for me since I want minimalistic 
and be hands-on. So I built it from scratch. 

If you want a blog that:
- generates plain HTML + CSS: fast, portable, no runtime
- has a responsive layout (sidebar on desktop, collapsible TOC on mobile)
- deploys automatically on every push via GitHub Actions
- stays minimal

This does that with a small build script and plain CSS !

## How It Works

```
content/posts/*.md  ─┐
build.js             ├─►  public/ (HTML, CSS, assets)
static/              ─┘
```

- **Markdown posts** in `content/posts/` with YAML frontmatter (`title`, `date`, `description`, `slug`, `topics`)
- **`build.js`** reads frontmatter with `gray-matter`, renders
  Markdown with `marked`, adds syntax highlighting via `highlight.js`,
  and generates pages with a responsive layout
- **`static/`** (CSS, images) is copied into the output unchanged
- **`public/`** is the generated site — gitignored, built by CI on every push

## Project Structure

```
blog/
├── content/
│   └── posts/          ← Markdown files go here
├── static/
│   ├── style.css       ← All blog styles
│   └── hljs.css        ← Syntax highlight theme
├── build.js            ← The build script
├── .github/
│   └── workflows/
│       └── deploy.yml  ← CI pipeline
└── public/             ← Generated output (gitignored)
```

## Post Frontmatter

Each post file in `content/posts/` must have valid YAML frontmatter. **All fields are required unless noted:**

```yaml
---
title: "Post Title"
date: 2024-04-26
slug: post-slug
description: "Short description for SEO."
topics: [topic1, topic2]
---
```

| Field        | Required | Notes |
|---|---|---|
| `title`      | Yes      | Used in page title, H1, and meta tags |
| `date`       | Yes      | Format: `YYYY-MM-DD`. If missing, build time is used and a warning is shown |
| `slug`       | No       | URL slug. Defaults to the filename without `.md`. Must be unique across all posts |
| `description`| Yes      | Meta description for SEO. If missing, the first paragraph is used (truncated to ~160 chars) and a warning is shown |
| `topics`     | No       | Array of topic labels, e.g. `[ai, crypto]`. Shown as chips on the index page. Topic pages are auto-generated |

Fallback behavior:
- **Missing slug** → derived from the filename (e.g. `my-post.md` → `/my-post/`)
- **Missing date** → uses build time (all undated posts sort together)
- **Missing description** → extracts first paragraph from content, truncates at ~160 chars
- **Missing topics** → post still appears on the index, no topic chip is shown

## Commands

```bash
npm install        # Install dependencies
npm run build      # Build site to public/
npx serve public   # Preview locally (serves on port 3000 by default)
npx serve public -l 3700 # serve on port 3700 or any other port
```

## Deployment

Push to `main`, GitHub Actions handles the rest:

1. Checks out the repository
2. Caches `node_modules` for faster installs
3. Runs `npm ci`
4. Runs `npm run build`: `GITHUB_REPOSITORY` env var auto-detects
   the repo name and sets the base path correctly
5. Publishes `public/` to the `gh-pages` branch via `peaceiris/actions-gh-pages`

No manual deployments. No separate publishing step. Just push.

### Base Path

When deploying to a subdirectory (e.g., `username.github.io/repo-name/`), set `BASE_PATH` locally:

```bash
BASE_PATH=/repo-name npm run build
```

For GitHub Pages root (`username.github.io`), leave it empty — the CI auto-detects from `GITHUB_REPOSITORY`.

For GitHub Pages to work, the repository must be **public**, and Pages
must be enabled at Settings → Pages → Source: `gh-pages` branch.
On the other hand, GitHub Pro lets you keep the source private
while the rendered blog remains public.

## Keeping Source Private ( GitHub Free )

If you want the source (posts, build script, drafts) private but 
the deployed site public:

1. Keep this repo **private**: your source, build script,
   drafts, work-in-progress posts
2. Create a separate **public** repository (e.g. `my-blog`):
   only receives the built output, serves at `username.github.io/blog`
3. In the workflow, use a **Personal Access Token (PAT)**
   with `repo` scope to push to the target repo:
    ```yaml
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.PAT }}
        publish_dir: ./public
        destination_repository: username/my-blog
    ```

4. Add the PAT as a secret in the **private** repo
   (`Settings → Secrets and variables → Actions`)

The CI builds privately, then pushes the `public/` output to
the public `my-blog` repo. The source never leaves your private repository.

## Scale

This blog + generator can handle years of regular writing:

- **~5,000–9,000 posts**: 1-2 posts per week for 25 years. Build
  time would still be fine though I never tested it.
- **Topic browsing**: with a large archive, topic pages make content
  discoverable without a full-text search engine.
- **Images**: When you paste an image in a Markdown file through
  the GitHub editor, it automatically uploads to
  `github.com/user-attachments/assets/...` — a GitHub-hosted CDN,
  not your repo. This keeps the repo lean.
- I suggest do not upload images directly into the repo;
  use the GitHub editor's built-in paste to get
  the CDN URL instead.
- If it's a private generator deployed to Public, images need to be put somewhere
  else Public.

## Tech

| Library | Purpose |
|---|---|
| [gray-matter](https://github.com/jonschlinkert/gray-matter) | Frontmatter parsing |
| [marked](https://github.com/markedjs/marked) | Markdown to HTML |
| [marked-highlight](https://github.com/markedjs/marked-highlight) | Code highlight plugin |
| [highlight.js](https://highlightjs.org/) | Syntax highlighting engine |

## TOC and Back

TOC anchor links and the browser Back button are inherently at odds, each
TOC click pushes a history entry, so Back navigates through every clicked
section before leaving the page. There are four ways to handle this:

**1. History-free TOC (`preventDefault`) — chosen**

```js
document.addEventListener('click', function(e) {
  var link = e.target.closest('[href^="#"]');
  if (link) {
    e.preventDefault();
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (target) { target.scrollIntoView(); }
  }
});
```

TOC clicks are intercepted, no history entry is created. Back always goes
to the actual previous page. Browser's own history management preserves
scroll position automatically.

Back button: referrer check -> if same-domain referrer exists, use
`history.back()`, otherwise the `<a>` goes to index.

URL never shows `#hash`, loses shareable deep-links.

Middle-click, right-click, and modified clicks open the index in a
new tab, Back button is for plain left-click only.

**2. Native TOC (browser history) + referrer back**

```html
<a href="#heading-id">Section</a>
```

TOC links work as normal anchors. Each click pushes a history entry with
the `#hash` in the URL. Back button uses referrer to go back to previous
page. URL is a shareable deep-link.

The tradeoff: when the user clicks 1 or more TOC sections, the Back
button goes back through each TOC entry before reaching the previous
page, which is not ideal.

**3a. Read-only TOC (static, no JS)**

```html
<li>Section Name</li>   <!-- plain text, no href -->
```

Decorative outline. No clicks, no JS. Just shows page structure.

**3b. Read-only TOC + scroll tracking (JS)**

Same as 3a, but with scrollspy JS that highlights the current section as
the user scrolls. Adds a scroll listener for a "you are here" cue.

**Smooth scroll for all anchor links (optional):**

```css
html { scroll-behavior: smooth; }
```

Makes both native anchor links and `scrollIntoView()` feel consistent
across all browsers.

## Features

- Syntax highlighting for 7+ languages in fenced code blocks
- Sticky sidebar (desktop) / collapsible TOC (mobile)
- Paginated index: 10 posts per page, numbered pages
- Auto-detects base path: works whether deployed at root or in a subdirectory
- Gitignored output: built by CI, never committed
- Small build script: easy to understand and modify
- Supports private source + public deployment via cross-repo CI
- Topic pages with chips on index for content browsing
- Scalable to years of posts without git or build performance issues
