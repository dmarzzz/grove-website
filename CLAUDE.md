# The Grove — Agent Instructions

## What This Is

A single-page static website for **The Grove** — a research organism housed in a former Catholic school in Greenpoint, Brooklyn. Part school, part convent, part sovereign R&D lab.

The site is live at `index.html`. No build step. No dependencies. No frameworks.

## Architecture

```
grove-website/
├── index.html              ← The entire site (single page, three scroll-snap sections)
├── styles/main.css         ← All styles, organized by section, CSS custom properties at top
├── scripts/main.js         ← Vanilla JS: fade-in observer + 3D brain point cloud (canvas)
├── content/                ← Canonical content source (markdown + JSON)
│   ├── meta.json           ← Title, tagline, descriptors, year
│   ├── about.md            ← About section prose
│   └── directions/         ← One file per project direction
│       ├── convent-toolkit.md
│       ├── data-curation.md
│       └── impact-assessment.md
├── assets/fonts/           ← Self-hosted fonts (currently empty — using Google Fonts)
├── AGENT_PROMPT.md         ← Full original build specification and design brief
├── README.md               ← Human-facing documentation
└── .github/workflows/
    └── deploy.yml          ← GitHub Pages deployment (push to main)
```

## How Content Works

Content lives in two places:

1. **`content/` directory** — The canonical, editable source. Markdown files with YAML frontmatter (for directions) and a JSON config file. When editing content, update these files first.
2. **`index.html`** — The rendered site. After editing content files, the corresponding HTML in `index.html` must be updated to match. There is no build step that does this automatically.

**When changing copy**: Edit the `content/` file, then update the matching section in `index.html`. Keep both in sync.

## How Styling Works

All styles live in `styles/main.css`. The file is organized into labeled sections:

```
Palette → Typography → Layout → Reset → Base → Texture → Selection →
Scrollbar → Sections → Hero → About → Directions → Footer → Animations → Responsive
```

**CSS custom properties** at the top of the file control everything themeable:

| Property | Controls |
|---|---|
| `--color-bg`, `--color-bg-warm`, `--color-bg-panel` | Background tones (aged parchment) |
| `--color-text`, `--color-text-body`, `--color-text-soft`, `--color-text-muted` | Text hierarchy |
| `--color-accent`, `--color-accent-dark` | Accent color (gold-olive) |
| `--color-rule`, `--color-rule-light`, `--color-rule-faint` | Borders, rules, dividers |
| `--font-display` | Heading/display font (Cormorant Garamond) |
| `--font-body` | Body text font (Inter) |
| `--font-mono` | Monospace accent (JetBrains Mono) |
| `--content-narrow` | Max-width of about section (640px) |
| `--content-wide` | Max-width of directions section (1060px) |

To retheme the site, change custom properties only. Do not scatter color values throughout the file.

## How the JavaScript Works

`scripts/main.js` contains two systems:

1. **Fade-in observer** — Uses `IntersectionObserver` to add `.visible` class to `.fade-in` elements on scroll. CSS handles the transition.

2. **3D Brain Point Cloud** — A canvas-based particle system in the hero section:
   - ~200 particles shaped into two cerebral hemispheres (3D ellipsoids)
   - Slow Y-axis rotation + X-axis tilt oscillation
   - Per-particle organic drift (sine-based, unique phase/speed per particle)
   - Depth-sorted rendering with perspective projection
   - Soft-glow sprites (pre-rendered radial gradients on offscreen canvases)
   - Faint connection lines between nearby particles (screen-space distance)
   - Two color tones: gold-olive (85%) and golden amber (15%)
   - Retina-aware canvas sizing via `devicePixelRatio`

Particle colors are hardcoded RGB values in `initPointCloud()`. To change them, update `spriteOlive`, `spriteGold`, the ambient glow gradient, and the connection line `strokeStyle`.

## Design Principles

- **Text-first. Generous whitespace.** The typography carries the design.
- **Warm, aged parchment aesthetic** with a 20% Elden Ring influence — slightly golden, subtly vignetted, atmospheric without being dark fantasy.
- **One digital flourish** — the brain point cloud. Everything else should feel printed.
- **Dot separators ( · )** as a visual motif throughout.
- **Three scroll-snap sections**, each occupying exactly `100vh` on desktop.
- **Three-column layout** for directions on desktop (>900px), single column on mobile.
- **Double-border broadside frame** on the about section.
- **Flanking ornamental rules** on the "Current Directions" heading (gradient fade from edges).
- **Diamond ornamental centerpoint** on the hero rule.
- **Monospace footer** as a digital counterpoint to the serif/sans-serif hierarchy.

## Voice & Tone

The writing voice is **declarative, dense, and precise**. Match this register:

- Short sentences. No hedging. Say what it is.
- Every sentence carries load. No filler.
- Metaphor used sparingly and effectively.
- Institutional confidence without corporate tone. Not a pitch deck.
- No exclamation marks, no "we're excited to announce," no startup copy.
- When in doubt, cut words.

## What NOT to Do

- No navbar, no cookie banners, no analytics, no tracking
- No CTAs, newsletter signups, or "join our community" buttons
- No stock imagery or AI-generated images
- No heavy animation or parallax
- No startup language ("revolutionizing," "building the future of")
- No JS frameworks or build tools
- Do not hardcode content in HTML without updating `content/` files
- Do not scatter color values — use CSS custom properties
- Do not add fonts without considering the <100KB page weight target
- Do not break the scroll-snap behavior
- When in doubt, remove

## Testing

```bash
# View locally (no build step)
open index.html

# Or serve it
npx serve .
```

Test at three breakpoints: 375px (mobile), 768px (tablet), 1200px+ (desktop).

Verify:
- Scroll snap locks to each section on desktop
- Three-column grid collapses to single column at ≤900px
- Point cloud renders and animates smoothly
- Fade-in animations trigger on scroll
- All text is readable at every breakpoint

## Fonts

Loaded from Google Fonts (no self-hosting currently):
- **Cormorant Garamond** — 300 italic, 500, 600 (display/headings)
- **Inter** — 300, 400 (body text)
- **JetBrains Mono** — 400 (footer, monospace accents)

## Deployment

Push to `main` branch. GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys to GitHub Pages automatically.
