#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const sourceDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, '..', 'GlobalMercuryRecovery', 'content', 'blog')

const siteUrl = 'https://lordshrrred.github.io/GMRWS_Feeder'
const mainSiteUrl = 'https://globalmercuryrecovery.com'
const syndicatedDir = path.join(root, 'syndicated')

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 86)
}

function parseFrontmatter(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${file} is missing frontmatter.`)

  const frontmatter = {}
  match[1].split('\n').forEach((line) => {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!pair) return
    const key = pair[1]
    let value = pair[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  })

  const tagMatch = match[1].match(/^tags:\s*\[([^\]]*)\]/m)
  frontmatter.tags = tagMatch
    ? tagMatch[1]
        .split(',')
        .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    : []

  const fallbackSlug = file.replace(/\.md$/, '')
  return {
    title: frontmatter.title || fallbackSlug.replace(/-/g, ' '),
    date: frontmatter.date || new Date().toISOString().slice(0, 10),
    description: frontmatter.description || '',
    tags: frontmatter.tags,
    slug: frontmatter.slug || fallbackSlug,
    body: match[2].trim(),
  }
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^>+\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function excerpt(markdown) {
  const text = plainText(markdown)
  if (text.length <= 460) return text
  return `${text.slice(0, 457).replace(/\s+\S*$/, '')}...`
}

function renderHeader(active = '') {
  const syndicatedActive = active === 'syndicated' ? ' aria-current="page"' : ''
  return `<header class="site-header">
      <a class="brand" href="${active === 'home' ? './' : '../'}" aria-label="Mercury Recovery Field Notes home">
        <span class="brand-mark">MR</span>
        <span>
          <strong>Mercury Recovery Field Notes</strong>
          <small>Water security, remediation, and mine land reuse</small>
        </span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="${active === 'home' ? '#notes' : '../#notes'}">Notes</a>
        <a${syndicatedActive} href="${active === 'home' ? 'syndicated/' : './'}">Syndicated</a>
        <a href="${mainSiteUrl}/blog">GMRWS Insights</a>
      </nav>
    </header>`
}

function pageShell({ title, description, canonical, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="alternate" type="application/rss+xml" title="Mercury Recovery Field Notes RSS" href="${canonical.includes('/syndicated/') ? '../rss.xml' : 'rss.xml'}">
    <link rel="stylesheet" href="${canonical.includes('/syndicated/') ? '../styles.css' : 'styles.css'}">
  </head>
  <body>
${body}
  </body>
</html>
`
}

function renderSyndicatedPost(post) {
  const canonicalMain = `${mainSiteUrl}/blog/${post.slug}`
  const feederUrl = `${siteUrl}/syndicated/${post.slug}.html`
  const tagList = post.tags.length
    ? `<ul class="topic-list">${post.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`
    : '<p>No tags provided.</p>'

  return pageShell({
    title: `${post.title} | Field Note Summary`,
    description: post.description || `Summary and source link for ${post.title}.`,
    canonical: feederUrl,
    body: `    ${renderHeader('syndicated')}
    <main>
      <section class="post-hero">
        <p class="eyebrow">Syndicated Summary</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(post.description || excerpt(post.body))}</p>
      </section>
      <div class="post-wrap">
        <article class="post-body">
          <p><strong>Source article:</strong> <a href="${canonicalMain}">${canonicalMain}</a></p>
          <p>${escapeHtml(excerpt(post.body))}</p>
          <h2>Why this matters</h2>
          <p>This topic sits at the intersection of mercury cleanup, mining-affected water systems, land regeneration, and funding readiness. The full GMRWS article provides the deeper technical and strategic context.</p>
          <h2>Topic signals</h2>
          ${tagList}
          <p><a class="button primary" href="${canonicalMain}">Read The Full Article</a></p>
        </article>
        <aside class="side-note">
          <p class="eyebrow">Canonical Source</p>
          <p>The original article is published by Global Mercury Recovery & Water Security. This feeder page exists to summarize and route readers to the canonical resource.</p>
          <a class="button secondary" href="${mainSiteUrl}/blog">Open GMRWS Insights</a>
        </aside>
      </div>
    </main>
    <footer><p>Mercury Recovery Field Notes</p><p><a href="../rss.xml">RSS</a> · <a href="../sitemap.xml">Sitemap</a></p></footer>`,
  })
}

function renderSyndicatedIndex(posts) {
  const cards = posts
    .map(
      (post) => `<article class="note-card">
            <a href="${post.slug}.html">
              <span class="tag">${escapeHtml(post.tags[0] || 'GMRWS Insight')}</span>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.description || excerpt(post.body))}</p>
            </a>
          </article>`
    )
    .join('\n')

  return pageShell({
    title: 'Syndicated GMRWS Field Notes',
    description: 'Feeder summaries linking to canonical Global Mercury Recovery & Water Security insights.',
    canonical: `${siteUrl}/syndicated/`,
    body: `    ${renderHeader('syndicated')}
    <main>
      <section class="post-hero">
        <p class="eyebrow">Syndicated GMRWS Insights</p>
        <h1>Fresh feeder summaries from the main remediation library.</h1>
        <p>These summaries point readers and crawlers back to canonical Global Mercury Recovery & Water Security articles.</p>
      </section>
      <section class="section">
        <div class="note-grid">
          ${cards}
        </div>
      </section>
    </main>
    <footer><p>Mercury Recovery Field Notes</p><p><a href="../rss.xml">RSS</a> · <a href="../sitemap.xml">Sitemap</a></p></footer>`,
  })
}

function readMainPosts() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Cannot find source blog directory: ${sourceDir}`)
  }

  return fs
    .readdirSync(sourceDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => parseFrontmatter(fs.readFileSync(path.join(sourceDir, file), 'utf8'), file))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}

function writeSyndicated(posts) {
  fs.rmSync(syndicatedDir, { recursive: true, force: true })
  fs.mkdirSync(syndicatedDir, { recursive: true })
  posts.forEach((post) => {
    const fileSlug = slugify(post.slug)
    fs.writeFileSync(path.join(syndicatedDir, `${fileSlug}.html`), renderSyndicatedPost(post), 'utf8')
  })
  fs.writeFileSync(path.join(syndicatedDir, 'index.html'), renderSyndicatedIndex(posts), 'utf8')
}

function updateHome(posts) {
  const indexPath = path.join(root, 'index.html')
  const html = fs.readFileSync(indexPath, 'utf8')
  const latest = posts.slice(0, 3)
  const cards = latest
    .map(
      (post) => `<article class="note-card">
            <a href="syndicated/${slugify(post.slug)}.html">
              <span class="tag">${escapeHtml(post.tags[0] || 'GMRWS Insight')}</span>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.description || excerpt(post.body))}</p>
            </a>
          </article>`
    )
    .join('\n')

  const block = `<section id="syndicated" class="section">
        <div class="section-head">
          <p class="eyebrow">Syndicated From GMRWS</p>
          <h2>Latest Main-Site Insights</h2>
        </div>
        <div class="note-grid">
          ${cards}
        </div>
      </section>`

  const nextHtml = html.includes('id="syndicated"')
    ? html.replace(/<section id="syndicated" class="section">[\s\S]*?<\/section>/, block)
    : html.replace('</main>', `${block}\n    </main>`)

  fs.writeFileSync(indexPath, nextHtml, 'utf8')
}

function updateFeeds(posts) {
  const allUrls = [
    `${siteUrl}/`,
    `${siteUrl}/posts/mercury-remediation-questions.html`,
    `${siteUrl}/posts/asgm-water-security.html`,
    `${siteUrl}/posts/tailings-to-regeneration.html`,
    `${siteUrl}/syndicated/`,
    ...posts.map((post) => `${siteUrl}/syndicated/${slugify(post.slug)}.html`),
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>
`

  const items = posts
    .slice(0, 25)
    .map((post) => {
      const url = `${siteUrl}/syndicated/${slugify(post.slug)}.html`
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeHtml(post.description || excerpt(post.body))}</description>
    </item>`
    })
    .join('\n')

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Mercury Recovery Field Notes</title>
    <link>${siteUrl}/</link>
    <description>Independent field notes and syndicated summaries on mercury remediation, water security, ASGM cleanup, and tailings recovery.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`

  fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap, 'utf8')
  fs.writeFileSync(path.join(root, 'rss.xml'), rss, 'utf8')
}

const posts = readMainPosts()
writeSyndicated(posts)
updateHome(posts)
updateFeeds(posts)
console.log(`Synced ${posts.length} main blog posts into feeder site.`)
