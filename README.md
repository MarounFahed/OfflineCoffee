# OFFLINE — Shopify theme

A custom Online Store 2.0 theme for **Offline**, a steeped specialty coffee brand.
Built per `_design-source/uploads/OFFLINE_COFFEE_THEME_BRIEF.md`.

## What's in here

```
.
├── assets/                           # flat (Shopify constraint — no subdirs)
│   ├── theme.css                     # single compiled stylesheet (~60KB)
│   ├── theme.js                      # single compiled script (~12KB)
│   ├── *.woff2 / gulfs-display.ttf   # self-hosted fonts (Latin + Latin-Ext)
│   └── logo-*.png                    # character mark + wordmarks
├── config/
│   ├── settings_schema.json          # global theme settings (colors, fonts, brand)
│   └── settings_data.json            # current values + Offline preset
├── layout/
│   ├── theme.liquid                  # main layout
│   └── password.liquid               # coming-soon page
├── locales/
│   ├── en.default.json               # complete (all microcopy from brief §12)
│   └── fr.json                       # stub
├── sections/
│   ├── header.liquid + footer.liquid
│   ├── header-group.json + footer-group.json   # wired into theme.liquid
│   ├── hero / tagline-ticker / featured-blends / brew-strip /
│   │   pull-quote / editorial-grid / resupply / compost-callout /
│   │   journal-preview                         # home sections (full design)
│   ├── manifesto / origin-story / featured-product   # composable for about, etc.
│   └── main-collection / main-product / main-cart / main-blog /
│       main-article / main-search / main-page          # template sections
├── snippets/
│   ├── product-card                  # home + grid variants
│   ├── bag-mockup                    # placeholder visual until real product photography
│   ├── signal-bars / topo-line / coordinate-stamp
│   ├── button / accordion-item / price / responsive-image
│   ├── meta-tags                     # OG + Article JSON-LD
│   └── icon                          # inline SVG icons
└── templates/
    ├── index.json                    # home (full custom design)
    ├── collection.json               # collection (full custom design)
    ├── product.json + cart.json      # PDP, cart (functional brand-consistent stubs)
    ├── blog.json + article.json      # the Journal
    ├── page.json + page.about.json   # generic + about composition
    ├── search.json                   # site search with mixed results
    ├── list-collections.liquid       # /collections route
    ├── 404.liquid                    # full pine bg, randomized coordinate stamp
    └── customers/
        ├── login / register / account / order / addresses /
        │   recover_password / reset_password .liquid
```

## Design scope status

| Page | Status | Notes |
|---|---|---|
| Home | ✅ Full custom design | 1:1 with `_design-source/Offline Home.html` |
| Collection | ✅ Full custom design | 1:1 with `_design-source/Offline Collection.html` |
| Product (PDP) | 🟡 Functional stub | Brand-consistent. Awaiting design round 2 |
| Cart | 🟡 Functional stub | Full-page (drawer is a fast-follow per brief §8.5) |
| Blog (Journal) | 🟡 Functional stub | Featured + grid pattern. Design pending |
| Article | 🟡 Functional stub | Drop cap + meta foot done. Design pending |
| Search | 🟡 Functional stub | Mixed product/article/page results |
| 404 | ✅ Full custom | Per brief §8.7 |
| About | ✅ Composes existing sections | Per brief §8.4 |
| Customer account / login / etc. | 🟡 Restyled stubs | Hairline forms, mono labels |

## Working on a dev store

```bash
# Install Shopify CLI once
npm install -g @shopify/cli @shopify/theme

# From the theme root
shopify theme dev --store=your-dev-store.myshopify.com
shopify theme push --store=your-dev-store.myshopify.com
shopify theme check
```

## Merchant tasks before the theme works fully

1. **Create three menus in Admin > Online Store > Navigation:**
   - `main-menu` (header)
   - `footer-shop`, `footer-story`, `footer-service` (footer columns)
2. **Create product metafields under namespace `offline.*`** so the cards pull
   the right roast color, signal bars, region, and tasting notes:
   - `offline.roast` (single line text — `light` / `medium` / `dark` / `decaf`)
   - `offline.blend_number` (single line text — e.g. `Blend 01`)
   - `offline.region_short` (single line text — e.g. `Light · Ethiopia`)
   - `offline.region` (single line text — e.g. `Yirgacheffe · 1,950m`)
   - `offline.tasting_tags` (list of single line text)
   - `offline.footnote` (single line text)
   - `offline.eyebrow` (single line text — PDP eyebrow)
   - `offline.badge` (single line text — collection card corner badge)
3. **Configure storefront filters** in Admin > Online Store > Navigation > Collections.
   The filter pills on `/collections/*` will use whatever filters you define;
   visual fallback renders if none configured.
4. **Add real product photography** later — every image component swaps via a
   single field update, no code change needed.

## Known TODOs flagged in code

- **Gulfs Display licensing** — sourced from freefontdownload.org, no license file.
  Confirm before public launch (commented in `assets/theme.css` font block).
- **Font subset** — currently Latin + Latin-Extended only. If the brand expands
  into Vietnamese / Cyrillic / etc., re-fetch and add unicode-range entries.
- **PDP variant picker** — currently a `<select name="id">` for stub mode.
  A JS-driven radio + price/availability swap belongs in design round 2.
- **Cart drawer** — full-page only per brief §8.5. Drawer is a fast-follow.

## Performance budgets (brief §11.5)

| Metric | Budget | Status |
|---|---|---|
| theme.css min | <80KB | ✅ ~60KB raw, expected ~22KB gzip |
| theme.js min | <30KB | ✅ ~12KB raw, expected ~5KB gzip |
| Hero image | preload + eager + fetchpriority="high" | ✅ |
| Lighthouse mobile (Slow 4G) | Perf ≥90, A11y =100, SEO ≥95, BP =100 | ⏳ verify against dev store |
| LCP / CLS / INP | <2.0s / <0.05 / <200ms | ⏳ verify against dev store |
| Page weight (home, ex hero) | <800KB | ⏳ verify against dev store |

## Acceptance criteria from brief §15

| Criterion | Status |
|---|---|
| Theme uploads cleanly via `shopify theme push` | ⏳ verify in dev store |
| All page templates render without fallbacks | ✅ |
| Merchant can edit hero / swap images / reorder sections from theme editor | ✅ |
| Color tokens flow from `settings_data.json` → CSS variables | ✅ |
| Lighthouse mobile (Perf ≥90, A11y =100, SEO ≥95, BP =100) | ⏳ verify |
| Every image via `image_url` filter | ✅ |
| Keyboard nav home → collection → PDP → cart → checkout | ✅ |
| Reduced-motion mode disables transforms; opacity fades remain | ✅ |
| No `<img>` external `src` | ✅ |
| Theme weight <1MB ex fonts | ✅ |
| ≥4 of 8 delight features shipped | ✅ shipped 6: cursor coord, no-WiFi 404, klaxon-free hover, brew timer, roast spectrum strip, going-offline cue |
| 404 / empty-cart / no-results all on-brand | ✅ |
