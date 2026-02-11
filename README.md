# The Grove

A research organism housed in a former Catholic school in Greenpoint, Brooklyn. Part school, part convent, part sovereign R&D lab. Engineering spaces, tools, and processes to catalyze and capture information between minds.

<!-- deploy trigger -->

## Run Locally

```
open index.html
```

Or serve it:

```
npx serve .
```

No build step. No dependencies. No frameworks.

## Edit Content

All written content lives in the `content/` directory as the canonical source:

```
content/
  about.md                 ← About section prose
  meta.json                ← Title, tagline, descriptors, year
  directions/
    convent-toolkit.md     ← The Convent Toolkit
    data-curation.md       ← Data Curation
    impact-assessment.md   ← Local AI Impact Assessment
```

Content files use markdown with YAML frontmatter (for directions). After editing content files, update the corresponding HTML in `index.html` to match. There is no automated build step — both files must stay in sync.

## Modify Styling

All styles live in `styles/main.css`. CSS custom properties at the top control palette, typography, and layout:

```css
--color-bg            /* Aged parchment background */
--color-text          /* Primary text (warm near-black) */
--color-accent        /* Gold-olive accent */
--color-rule          /* Borders and ornamental rules */
--font-display        /* Display/heading font (Cormorant Garamond) */
--font-body           /* Body text font (Inter) */
--font-mono           /* Monospace accent (JetBrains Mono) */
--content-narrow      /* About section max-width (640px) */
--content-wide        /* Directions section max-width (1060px) */
```

Change these values to retheme the entire site from one place.

## Architecture

```
grove-website/
├── index.html              ← Single-page static site (three scroll-snap sections)
├── styles/main.css         ← All styles, CSS custom properties, responsive breakpoints
├── scripts/main.js         ← Vanilla JS: scroll fade-in + 3D brain point cloud
├── content/                ← Canonical content source (markdown + JSON)
│   ├── meta.json
│   ├── about.md
│   └── directions/
├── assets/fonts/           ← Self-hosted fonts (empty — currently using Google Fonts)
├── CLAUDE.md               ← Agent instructions for AI contributors
├── AGENT_PROMPT.md         ← Full original build specification and design brief
├── .github/workflows/
│   └── deploy.yml          ← GitHub Pages auto-deploy on push to main
└── README.md
```

Pure HTML + CSS + vanilla JS. Fonts from Google Fonts (3 families). Target page weight under 100KB.

## For AI Agents

See `CLAUDE.md` for comprehensive agent instructions — architecture details, design principles, voice/tone guidelines, and constraints.

See `AGENT_PROMPT.md` for the original build specification including the full design brief, reference document, and deliverables checklist.

This repo is designed to be easily extended by both human contributors and AI agents.

## Deployment

Push to `main`. GitHub Actions deploys to GitHub Pages automatically via `.github/workflows/deploy.yml`.
