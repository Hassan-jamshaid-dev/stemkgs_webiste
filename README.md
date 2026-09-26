# STEM Society website

Informational static site for the **STEM Society** at Karachi Grammar School. The project is plain HTML, CSS, and JavaScript: there is no backend, no accounts, and no forms that collect visitor data. Pages describe subjects, internal and external competitions, a photo gallery, society programmes, and short legal notices.

---

## What each section is

### Home page (`index.html`)

Sections appear in this order:

1. **Navigation** — Fixed header with the society logo and primary links: About, Subjects, Competitions, Gallery, Accomplishments, Contact. On the home page, About, Subjects, Competitions, and Contact jump to in-page anchors. Gallery and Accomplishments open their own HTML files. A mobile menu toggle opens and closes the link list on small screens.

2. **Header / hero** — Full-bleed photo collage of STEM Society events, with the brand title **STEM Society**, a short Karachi Grammar School eyebrow, and the standfirst “Eight subjects. One standard for difficult work.”

3. **Subjects** — Eight subject entries: Maths, Physics, Chemistry, Computer Science, Robotics, Biology, Astronomy, and Crime. Maths, Physics, Chemistry, Computer Science, Biology, and Crime link to their own pages. Robotics and Astronomy link to the shared coming-soon placeholder.

4. **Internal competitions** — Events run by STEM Society for KGS students:
   - **Hackathon** → `hackathon.html` (placeholder)
   - **Interhouse Science Bowl** → `interhouse.html`
   - **STEM Gauntlet** → `gauntlet.html`
   - **KGSO** (Karachi Grammar STEM Olympiad, flagship) → `kgso.html`

5. **External competitions** — Contests outside KGS that society members enter:
   - **ACSEC** → `acsec.html`
   - **Aero Pakistan** → `aero-pakistan.html`
   - **Race Pakistan** → `race-pakistan.html` (page title and copy use **RACE Pakistan**)
   - **SciFi** and **SciNova** — named on the home page only; they do not have their own HTML pages in this repo. SciNova is also mentioned on the Maths page as the host of a mathematics module.

6. **About** — Short statement of what STEM Society is at Karachi Grammar School.

7. **Contact** — Tells visitors to speak with a society member at the school (no contact form).

8. **Footer** — Copyright year, plus links to Terms and conditions, Privacy policy, and Top.

### Separate pages

**Subject pages**

- **`maths.html`** — This year’s maths team photos, named competition modules (including **Calculi Hipparchi** at KGSO, Ptolemy's Puzzle at SciNova, and Fibonacci's Trials at ACSEC), and a placeholder for team accomplishments until they are known.
- **`physics.html`**, **`chemistry.html`**, **`biology.html`** — Team photo grids; competition modules and accomplishments sections are placeholders until names and results are known.
- **`computer-science.html`**, **`crime.html`** — Team photo grids and placeholder accomplishments (no modules list on these pages yet).
- **`coming-soon.html`** — Shared placeholder for Robotics and Astronomy (and any unfinished subject link). Visitors only see a short “not ready yet” message and a link back to Subjects.

**Society and competition pages**

- **`gallery.html`** — Photograph grid of memorable STEM Society moments; visitors browse images loaded from `assets/images/`.
- **`accomplishments.html`** — Short, non-invented notes on programmes the society runs: Hackathon, Interhouse Science Bowl, STEM Gauntlet, and KGSO.
- **`kgso.html`** — Full KGSO page: what it is, scale, subject modules (including Calculi Hipparchi under Math), how rounds work, floor photographs, and awards. Uses its own stylesheet and script in addition to the shared home assets.
- **`interhouse.html`** — Interhouse Science Bowl detail: the four houses (**Frere**, **Napier**, **Streeton**, **Papworth**), about the event, photo strip, and last year’s champions.
- **`gauntlet.html`** — STEM Gauntlet detail: what the selection process is for, and a small photo gallery from the event.
- **`hackathon.html`** — Placeholder only (“Coming soon”); Hackathon content is not written yet.
- **`acsec.html`** — ACSEC (Aitchison College Science & Engineering Concept): overview, module tracks, and a note on KGS STEM Society involvement (specific results placeholder).
- **`aero-pakistan.html`** — Aero Pakistan: overview, engineering modules, KGS flight legacy, achievements placeholder, FAQ, and a link back to Contact.
- **`race-pakistan.html`** — RACE Pakistan: overview, motorsport/engineering modules, KGAS involvement, awards, FAQ, and a link back to Contact.

**Legal**

- **`terms.html`** — Plain-language terms for using the informational site.
- **`privacy.html`** — States that the site is static, does not store visitor data via accounts or forms, and notes ordinary host logs and Google Fonts requests.

Supporting intent notes (some still planned rather than built) live in `ARCHITECTURE.md`.

---

## How the code is organised

### Folder layout

```
.
├── index.html              # Home page
├── *.html                  # Subject, competition, gallery, legal pages
├── css/                    # Stylesheets
├── js/                     # Client-side scripts
├── assets/images/          # Logo and photographs referenced by the pages
├── README.md               # This document
└── ARCHITECTURE.md         # Structure and intent notes
```

### HTML files (responsibilities)

| File | Role |
|------|------|
| `index.html` | Landing page: nav, hero collage, subjects, internal and external competitions, about, contact, footer |
| `maths.html`, `physics.html`, `chemistry.html`, `computer-science.html`, `biology.html`, `crime.html` | Subject team pages |
| `coming-soon.html` | Shared unfinished-subject placeholder |
| `gallery.html` | Photo gallery |
| `accomplishments.html` | Short list of society programmes |
| `kgso.html` | KGSO detail page |
| `interhouse.html` | Interhouse Science Bowl |
| `gauntlet.html` | STEM Gauntlet |
| `hackathon.html` | Hackathon placeholder |
| `acsec.html` | ACSEC |
| `aero-pakistan.html` | Aero Pakistan |
| `race-pakistan.html` | RACE Pakistan |
| `terms.html` | Terms and conditions |
| `privacy.html` | Privacy policy |

### CSS

- **`css/home.css`** — Shared site styles: colour tokens, fixed nav, hero collage, subjects, competitions, about/contact, interior page layouts (gallery, subject teams, legal pages, shared page chrome), and footer. Linked from almost every page.
- **`css/kgso.css`** — Styles scoped to `body.kgso-page` for the KGSO page only (hero field, module cards, awards, gallery). Does not restyle the home hero.
- **`css/interhouse.css`** — Styles for the Interhouse Science Bowl page (house colours, gallery, champions).
- **`css/gauntlet.css`** — Layout extras for the STEM Gauntlet page (about block and photo grid).
- **`css/acsec.css`** — ACSEC page look (navy/cyan accents, modules, stats).
- **`css/aero-pakistan.css`** — Aero Pakistan page look (modules, FAQ, CTA).
- **`css/race-pakistan.css`** — RACE Pakistan page look (modules, awards, FAQ).

### JavaScript

- **`js/home.js`** — Shared behaviour on most pages: mobile nav toggle (including Escape to close), scrolled nav state, and hero collage repair when a photo fails to load.
- **`js/kgso.js`** — KGSO-only progressive enhancement: animated star field on the hero (respects reduced motion) and light pointer tilt on module cards. Content stays readable if the script does not run.

### Assets

**`assets/images/`** holds the society logo (`logo.jpg`, used as favicon and nav mark) and the photographs the pages load: home hero and gallery shots, subject team portraits, KGSO floor photos, Interhouse Science Bowl photos, STEM Gauntlet photos, and related event images. There is no separate photos folder; everything referenced by the HTML lives under this directory.

Temporary work folders at the repo root (if any) are not part of the published page set.

---

## How to view locally

No build step is required.

1. Open `index.html` in a browser from the project folder, or
2. From the project root, serve the folder and browse it:

```bash
python -m http.server
```

Then visit `http://localhost:8000` (or the port shown in the terminal).

The private GitHub repository was **Hassan-jamshaid-dev/web** and may be mid-rename to **Hassan-jamshaid-dev/stemkgs_webiste**. This document does not invent deploy steps.

A commit has not been requested for this README update; do not commit or push unless asked.
