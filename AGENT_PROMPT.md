# Claude Agent Prompt: The Grove Website

## Overview

Build a single-page static website for **The Grove** — a research organism housed in a former Catholic school in Greenpoint, Brooklyn. The Grove is part school, part convent, part sovereign R&D lab. The site should be minimal, elegant, and feel like a serious new corner of the internet. It must work beautifully on both mobile and desktop.

---

## Voice & Tone Reference

The writing voice for this site should match the style of the reference document below. Key qualities:

- **Declarative.** Short sentences. No hedging. Say what it is, not what it might be.
- **Dense.** Every sentence carries load. No filler paragraphs.
- **Precise but not dry.** Uses metaphor sparingly and effectively ("The garden is on the roof. The hardware is in the basement. The metaphor is also literal."). Em dashes for parenthetical precision.
- **Institutional confidence without corporate tone.** Reads like a research manifesto, not a pitch deck. No exclamation marks, no "we're excited to announce," no startup copy.
- **Structure carries meaning.** Hierarchy is deliberate. Labels are short. Descriptions earn their space.

When in doubt, cut words. The reference document says things like "Verifiable, not trustworthy" and "If you notice the tech, the design has failed." Match that register.

---

## Design Direction

**Aesthetic north star:** The vibe of a new, small, serious research institution on the internet — not a startup landing page. Think plain text sites with one or two surprising flourishes. Inspired by sites like `gwern.net`, early `are.na`, `100r.co`, or the homepages of independent AI labs and crypto research collectives.

**Key principles:**
- Overwhelmingly simple. Text-first. Generous whitespace.
- A subtle parchment / old scroll texture or warm off-white background — as if the page itself is a broadside or proclamation pinned to a wall in a former convent.
- Typography carries the design: use a serif with academic or slightly flourished character for headings (e.g., Playfair Display, EB Garamond, or Cormorant Garamond). Body text should be clean and highly readable (a good sans-serif or a restrained serif).
- One futuristic/digital counterpoint element to contrast the academic warmth — could be a piece of ASCII art, a subtle monospace accent, a generative SVG glyph, or a procedural decoration. Tasteful and minimal; a wink, not a theme.
- Dot separators ( · ) as a motif — the reference doc uses them. Carry this into the visual language.
- No hero images, no gradients, no glassmorphism, no heavy UI framework feel. If anything animates, it should be barely perceptible (e.g., a slow fade-in on scroll).
- Color palette: warm off-white background, near-black text, one muted accent color (deep olive, burnt umber, or dark teal). Optional: a faint secondary accent for digital/futuristic elements.

---

## Site Structure

Single vertical scroll. Three distinct sections, each roughly one viewport tall (adjust for content on mobile).

### Section 1 — Hero

Centered on the viewport:

```
THE GROVE

The School  ·  The Convent  ·  Greenpoint, Brooklyn

Engineering spaces, tools, and processes
to catalyze and capture information between minds.
```

- "THE GROVE" in the flourished serif, large.
- The three descriptors in small caps or a lighter weight, separated by dot middots ( · ), spaced beneath the title.
- The tagline in italics or a slightly smaller size, set off visually. No quotation marks — let it breathe.
- Optionally: a small decorative element — ASCII art, a botanical glyph, a thin ornamental rule — separating this from the scroll cue.
- A subtle scroll indicator (small downward chevron or "↓") at the bottom of the viewport.

### Section 2 — About

A short, dense prose block describing what The Grove is. The copy should draw from the thesis section of the reference framework (included below as context for the agent), adapted for a public-facing audience — still precise and declarative, but slightly warmer. One to three paragraphs max.

**Pull the actual copy from `content/about.md` at build time.** For now, seed that file with this draft (to be refined):

> A small, dense community — running sovereign infrastructure, governing its own data, verifying its own claims — can produce more genuine intellectual value than organizations a hundred times its size.
>
> The Grove is built inside a former Catholic school in Greenpoint, Brooklyn. The mechanism is old: complementary minds, a shared library, honest inquiry, enough time. What is new is the instrumentation. Local compute. Consent-governed data. Provenance on every claim. Technology that disappears into the room.
>
> Seven layers of a single organism. The garden is on the roof. The hardware is in the basement.

- Keep the text column narrow (max ~640px) for readability.
- This section should feel like reading a well-typeset broadside or a page from an institutional charter.

### Section 3 — Ongoing Projects

Three project blocks, stacked vertically. Each has a short title, a one-line descriptor, and a brief paragraph.

**Heading:** "Ongoing Projects"

**The three directions:**

1. **The Convent Toolkit**
   *Everything needed to run a sovereign R&D lab — on your own hardware.*

   A local-first starter kit for small research communities. Record conversations, transcribe whiteboards, turn discussions into linked documents, grow a shared knowledge base over time. All inference runs locally — laptops, phones, no cloud dependencies. Your lab, your data, your stack. Released as an open-access toolkit and recruitment mechanism.

2. **Data Curation**
   *Building a living archive of unique datasets for open model training.*

   Identifying, collecting, and structuring distinctive data sources absent from standard training corpora. The goal: a curated, growing archive purpose-built for fine-tuning open-source models. Seeding the commons with signal that matters.

3. **Local AI Impact Assessment**
   *Mapping the stack. Finding the leverage points.*

   A research survey of local and open-source AI infrastructure — inference engines, model architectures, fine-tuning toolchains — identifying where investment moves the needle most. Where can a dollar or an hour do the most to make sovereign compute practical for everyone?

**Layout:**
- Stacked vertically with clear separation (horizontal rule, generous spacing, or a dot separator line: · · ·).
- Each block could have a small glyph or unicode symbol for visual identity. Keep it subtle.
- On mobile, each block should be digestible as a single scroll-stop.

---

## Technical Requirements

### Stack
- **Pure HTML + CSS + minimal vanilla JS.** No frameworks. No build step required. Anyone can clone this, open `index.html`, and see the site.
- Alternatively: an extremely lightweight static site generator (Eleventy/11ty) if it helps with the markdown → HTML content pipeline. If used, document the build step clearly.

### Content Separation (Critical for Agent Collaboration)

All written content lives in clearly separated, easily editable files — never hardcoded in HTML templates. This is what enables parallelization: one agent works on copy, another on implementation.

```
content/
  about.md                ← About section prose
  directions/
    convent-toolkit.md    ← Project 1
    data-curation.md      ← Project 2
    impact-assessment.md  ← Project 3
  meta.json               ← Title, tagline, descriptors, config
```

`meta.json` example:
```json
{
  "title": "The Grove",
  "descriptors": ["The School", "The Convent", "Greenpoint, Brooklyn"],
  "tagline": "Engineering spaces, tools, and processes to catalyze and capture information between minds.",
  "year": "2025"
}
```

### Styling Separation
CSS in a separate file (`styles/main.css`), well-commented, organized into clearly labeled sections:
- `/* — Palette — */`
- `/* — Typography — */`
- `/* — Layout — */`
- `/* — Decorative — */`

Use CSS custom properties for all colors, font families, and key spacing values so they can be changed in one place.

### Repository Structure

```
the-grove-site/
├── README.md
├── index.html
├── styles/
│   └── main.css
├── scripts/
│   └── main.js
├── content/
│   ├── about.md
│   ├── meta.json
│   └── directions/
│       ├── convent-toolkit.md
│       ├── data-curation.md
│       └── impact-assessment.md
├── assets/
│   └── fonts/          ← Self-hosted fonts if used
└── .github/
    └── (GitHub Pages deploy action)
```

### README.md Must Include
- One-paragraph description of what The Grove is.
- How to run locally (`open index.html` or `npx serve`).
- How to edit content (→ `content/` directory, markdown files, `meta.json`).
- How to modify styling (→ `styles/main.css`, CSS custom properties).
- Brief architecture overview.
- Note: "This repo is designed to be easily extended by both human contributors and AI agents."

### Responsiveness
- Mobile-first. Test at 375px, 768px, 1200px+.
- Hero must feel centered and impactful at all sizes.
- Project blocks readable and well-spaced on phones.

### Performance
- Target < 100KB total page weight.
- Self-host fonts or use 1–2 Google Fonts max.
- No JS frameworks. Vanilla JS for progressive enhancement only (smooth scroll, subtle fade-in on scroll).

---

## What NOT to Do
- No navbar. Three sections; a nav is unnecessary.
- No footer bloat. At most: "The Grove · Greenpoint, Brooklyn · 2025"
- No cookie banners, analytics, or tracking.
- No CTAs, newsletter signups, or "join our community" buttons.
- No stock imagery or AI-generated images.
- No heavy animation or parallax.
- No startup language. No "we're building the future of." No "revolutionizing." Match the reference voice.
- When in doubt, remove.

---

## Reference Document (for tone, terminology, and context — do not reproduce verbatim on the site)

The following is the internal research framework. Use it to understand what The Grove is, absorb the voice and terminology, and inform the About section copy. The website should be a public-facing distillation — not a reproduction — of this document.

<reference>
Thesis: A small, dense community — running sovereign infrastructure, governing its own data, verifying its own claims — can produce more genuine intellectual value than organizations a hundred times its size. The mechanism is old: complementary minds, a shared library, honest inquiry, enough time. What is new is the instrumentation.

The Grove is seven layers of a single organism, built inside a former Catholic school in Greenpoint. Each layer depends on the others.

Core Principles:
- Local-first sovereignty. Core operations survive upstream changes. Compute is institutional. Data does not leave the building unless the member takes it.
- Ownership follows contribution. The data cooperative distributes returns via Shapley attribution. Members exit with their data.
- Verifiable, not trustworthy. Provenance chains on every output. The integrity layer runs on math, not reputation.
- The mirror, not the microscope. Everything the system infers about a person belongs to that person.
- Invisible instrumentation. The most advanced technology disappears into the room. If you notice the tech, the design has failed.
- Compounding by design. Each layer feeds the next. The library grows. The models improve. The community attracts.

The Stack (VII layers): Canopy (Interface), Bark (Integrity), Sapwood (Inference), Heartwood (Memory), Roots (Acquisition), Mycelium (Coordination), Soil (Substrate).

"The garden is on the roof. The hardware is in the basement. The metaphor is also literal."
</reference>

---

## Summary of Deliverables

1. A complete, working static site matching the above spec.
2. All content in separated markdown/JSON files in `content/`.
3. A clear README for human and agent contributors.
4. Clean, commented, variable-driven CSS.
5. GitHub-ready: push and deploy to GitHub Pages immediately.
