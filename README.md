# Mercury Recovery Field Notes

Static feeder site for Global Mercury Recovery & Water Security topic coverage.

Planned GitHub Pages URL:

`https://lordshrrred.github.io/GMRWS_Feeder/`

## Publishing

This repo is intentionally static. GitHub Pages can publish directly from the `main` branch root.

Recommended Pages settings:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

The site includes:

- `index.html`
- three seed field-note posts
- generated `syndicated/` summaries from the main GMRWS blog
- `rss.xml`
- `sitemap.xml`
- `robots.txt`
- `.nojekyll`

## Syndication

The `Sync Main Blog` GitHub Action checks out `Lordshrrred/GlobalMercuryRecovery`, reads `content/blog`, and generates feeder summary pages in `syndicated/`.

The summary pages link back to the canonical articles on:

`https://globalmercuryrecovery.com/blog`

Manual local sync:

```bash
node scripts/sync-main-blog.mjs ../GlobalMercuryRecovery/content/blog
```
