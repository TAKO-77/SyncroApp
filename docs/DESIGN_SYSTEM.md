# Design System
# 01 Brand Identity
Elegant, organized, focused, and adaptable (Dark/Light). The interface is a near-black shell with a floating sidebar panel and rounded cards (bento layout), pill-shaped controls and a single amber accent with a soft glow.

## Logo
- Primary logo colour: **Amber `#FFB020`** (symbol blades and SYNCRO lettering).
- Centre dot: **Light amber `#FFE4A3`**.
- Windows icons must have a **transparent background**, including the gaps between the blades. Use a square canvas with the symbol filling approximately **94%** of its dimensions to remain legible in the taskbar; no background tile or shadow.
- Use the same logo colours in both themes, desktop shortcuts, executable icons and installer branding. Preserve the symbol geometry and lettering.
- Source images: `codigo-fonte/src/assets/syncro-symbol.png` and `syncro-logo.png`; Windows icons: `desktop/assets/Syncro.ico` and `Syncro-brand.ico`.
- Transparent Windows master: `desktop/assets/syncro-icon.png`; provide ICO sizes 16, 24, 32, 48, 64, 128 and 256 pixels. The build copies `Syncro-brand.ico` as `Syncro-brand-amber-transparent.ico`, which the installer and shortcuts use to avoid the previous cached background.
- In the UI, logo images use the SVG filter `#logo-background` (`LogoFilter` in `components/common.tsx`) to remove their dark background. Render `LogoFilter` wherever the logo appears.
- The interface accent uses the same amber as the logo.

# 02 Colour Palette
All interface colours are CSS custom properties at the top of `codigo-fonte/src/styles.css`. Dark is the default; light is applied with `data-theme="light"` on `<html>` and only redefines the tokens.

## Core tokens
| Token | Name | Hex (Dark) | Hex (Light) | Use for |
|-------|------|-----------|-------------|---------|
| `--bg` | Shell | #0C0D0D | #E9E9E5 | Window background behind the sidebar and cards |
| `--s1` | Panel | #151616 | #FFFFFF | Sidebar, cards, toolbars, dialogs, popovers, task rows |
| `--s2` | Surface | #1C1E1E | #F4F4F1 | Inputs, buttons, list rows inside cards, segmented tracks |
| `--s3` | Raised | #242626 | #ECECE8 | Hover on rows, selected segment, progress tracks |
| `--l1` | Border | #232525 | #E2E2DD | Card borders, dividers, grid lines |
| `--l2` | Border Strong | #303333 | #D0D0CA | Input, button, chip, dialog and popover borders |
| `--tx` | Text Primary | #F2F2EF | #17181A | Main text, headings |
| `--mu` | Text Muted | #8E9191 | #5F6267 | Labels, secondary text, placeholders, inactive nav |
| `--ac` | Accent Ink | #FFB020 | #9A6000 | Accent text and icons: active nav icon, links, greeting name |
| `--ac-fill` | Accent Fill | #FFB020 | #FFB020 | Primary buttons, today markers, selected picker day, focus ring, progress |
| `--accent-text` | On Accent | #1B1404 | #1B1404 | Text on `--ac-fill` |
| `--accent-soft` | Accent Soft | amber 13% | amber 18% | Active nav gradient, accent badges, focus halo |
| `--glow` | Glow | amber 20% | amber 28% | Primary button hover shadow, focus timer glow, now line |
| `--success` | Success | #3CCF7F | #15803D | Income, positive values, "em dia", task completion |
| `--error` | Error | #F26161 | #C62828 | Errors, overdue, negative values, destructive actions |
| `--brand` | Brand Amber | #FFB020 | #FFB020 | Logo lettering |
| — | Brand Centre | #FFE4A3 | #FFE4A3 | Logo centre dot |

- Keep `--ac` for anything read as text (amber text on white needs the darker ink) and `--ac-fill` for filled shapes.
- Shadows: `--shadow` for dialogs, popovers and the floating mobile nav; `--shadow-sm` for hover lift on cards and rows.

## Secondary palette (`codigo-fonte/src/lib/palette.ts`)
Used for categories, priorities, effort levels, charts and special dates. Components receive the colour through the `--c` custom property.

| Name | Hex | Typical use |
|------|-----|-------------|
| Gold | #D2BD62 | Default category colour, medium priority, "Projeto" effort |
| Sage | #8BB08B | Low priority, quick effort, income bars, health |
| Slate | #9FB0C0 | Transport, travel, sleep |
| Clay | #CF7F7F | High priority, birthdays, exams, expense bars |
| Neutral | #A4A7A7 | "Outro" and uncategorised items |
| Muted | #6B7280 | Free time in charts |

- Urgent priority uses `PALETTE.error`.
- Tinted backgrounds are derived from `--c` with `color-mix` (12–20% over the surface), never with new hex values.
- In light mode, category text (chips, tags, effort pills) is mixed 55% with `--tx` for contrast.

# 03 Typography
One family: **Manrope** (400, 500, 600, 700), loaded from Google Fonts in `codigo-fonte/index.html`, fallback `"Segoe UI", system-ui, sans-serif`. Token: `--font`.

| Style | Size / Weight | Use |
|-------|---------------|-----|
| Greeting | clamp(26px, 2.6vw, 32px) / 600, letter-spacing −0.02em | "Bom dia, Nome" on Início |
| Display number | 34px / 700 | Focus timer, main finance value |
| KPI value | 28px / 700, letter-spacing −0.02em | Início summary cards |
| Value | 22–26px / 700 | Finance cards, donut centre |
| Page title (H2) | 24px / 700, letter-spacing −0.01em | Section titles |
| Dialog title | 18–20px / 700 | Modals, confirmations |
| Toolbar title | 18px / 700 | Week/month label |
| Card title (H3) | 15–16px / 600 | Card headers |
| Body | 14px / 400, line-height 1.55 | Default text |
| Control | 13px / 600 | Buttons, segmented controls, links |
| Small | 12–13px / 500 | Labels, captions, chips |
| Caption | 10–11px | Hour labels, metadata, mobile nav |
| Overline | 11px / 600, uppercase, letter-spacing 0.08–0.1em | Section labels (Foco, Próximos 31 dias) |

- Numbers that change or align use `font-variant-numeric: tabular-nums` (`.num`).

# 04 Spacing
- Shell: 16px padding around the window and 16px gap between the sidebar and the page (12px on mobile).
- Card grids: 16px gap (10px on mobile).
- Card padding: 18px × 20px; dialogs 24px; inner list rows 8px × 12px.
- Gaps between inline controls: 6–12px.
- Narrow pages (settings, profile, tasks): max-width 760px.

# 05 Border Radius
| Radius | Use |
|--------|-----|
| 4–8px | Small markers, calendar day labels, logo, inline code |
| 10px | Event blocks, picker and select options, finance rows |
| 12px | Inputs, pickers, nav items, sidebar toggle |
| 14px | Task rows, list rows inside cards, note cards |
| 16px | Popovers, workspace picker and menu, focus timer card |
| 20px | Cards, toolbars, sidebar panel, dialogs, timetable, month grid |
| 999px (pill) | Buttons, segmented controls, chips, tags, badges, toast, effort pills |
| 50% | Avatars, profile button, day numbers, checkboxes, colour dots |

# 06 Components
## Shell
- **Sidebar:** floating panel (`--s1`, 20px radius) beside the page; 72px collapsed, 240px expanded, with optional auto-open on hover. Active item: accent-soft gradient fading to the right, 1px inner border, icon in `--ac`. Settings sits at the bottom above a divider. The focus timer is a card with an amber glow.
- **Top bar:** greeting (Início only) and the date on the left; "Adição rápida" primary pill and the round profile button on the right.
- **Início hero (`.top.hero`):** on Início the top bar is a card (`--s1`, 20px radius) with a slow amber/slate aurora (`--hero-1..3`, blurred radial gradients, 22s loop) and film grain (`--hero-grain`) behind it; both are tuned per theme. On mobile the card wraps only the greeting. Pure CSS, static under reduced motion.
- **Mobile (≤ 760px):** the sidebar becomes a floating bottom bar inset 12px from the edges, with a shadow.

## Controls
- **Primary button (`.btn.pri`):** amber pill (`--ac-fill`), `--accent-text`, weight 700; lifts 1px with a glow on hover.
- **Button (`.btn`):** `--s2` pill with 1px `--l2` border, 13px/600; border turns amber on hover; scales to 95% when pressed. Variants: `.ghost`, `.dng` (error text), `.dng-solid` (solid error), `.sq` (36px icon button), `.sm` (30px).
- **Inputs, selects, textareas, picker fields:** `--s2`, 1px `--l2`, 12px radius; amber border and a 3px accent-soft halo on focus.
- **Segmented control (`.seg`):** pill track on `--s2`; the selected option is a raised pill (`--s3` with an accent-soft tint and inner border).
- **Chips (`.chip`, `.cp`):** outlined pills with an 8px colour dot from `--c`; selected state uses the category colour as border and a 14% tint.
- **Scrollbars:** 10px wide (8px in pickers, selects and textareas), no arrow buttons, transparent track, pill thumb in `--mu` at 30% (55% on hover, a deeper amber, `--ac-fill` mixed 70% with black, while dragging). Styled with `::-webkit-scrollbar`, so don't set `scrollbar-width` or `scrollbar-color` on an element unless you want to hide its scrollbar (Chromium ignores the pseudo-elements once those are set).
- **Pickers (`DatePicker`, `TimePicker`, `Select`):** popover (`.pop`, 16px radius); the selected day is an amber fill, today has an amber ring.

## Content
- **Card (`.card`, `.fc`, `.upcoming`, `.tadd`, `.task-notes`):** `--s1`, 1px `--l1`, 20px radius, 18px × 20px padding. Header row (`.card-h`) with a 15px title and a muted link with an arrow (`.link-btn`).
- **KPI card (`.kpi`):** label, trend badge, large value and a muted footnote; the whole card is a button to its tab and lifts on hover.
- **Badges (`.trend`):** pills — `.up` success tint, `.down` error tint, `.acc` accent tint.
- **Tags (`.tag`):** pill with a dot and a 14% tint of `--c`.
- **List rows (`.hl-row`):** `--s2`, 14px radius, 52px min height; the current event has an amber border and an accent gradient; past events are dimmed.
- **Task Row (`.tk`):** `--s1`, 1px border, 3px left border in the priority colour, 14px radius, 56px height. Completing a task plays a check pop with a ring and particles, strikes the title, shows "✓ Concluída" and slides the row away.
- **Event block (`.ev`):** 10px radius, 3px left border in the category colour, 16% tint over the panel.
- **Note cards (`.note-card`):** masonry grid, `--s2`, 14px radius, amber border while editing.
- **Empty state (`.tem`):** dashed `--l2`, 20px radius, centred muted text.
- **Hidden money (`.blurred`, `.fwrap.blur`):** finance values are blurred until the user chooses "Mostrar valores".

## Overlays
- **Dialog (`Modal`):** `--s1`, 1px `--l2`, 20px radius, `--shadow`, backdrop of the shell colour at 78% with an 8px blur.
- **Confirmation dialog:** max-width 380px, `.dng-solid` confirm button.
- **Quick add:** command-style dialog, max-width 560px, 20px input text.
- **Toast:** pill at the bottom centre, `--s1`, action link in `--ac`.

## Screens
- **Início (`features/inicio/Inicio.tsx`):** four KPI cards (agenda, tasks, month balance, special days), then a two-column grid with today's agenda, the most urgent tasks, a six-month finance chart with the top expense categories, and the next special days.
- **Sign-in and desktop-only screens (`.auth`, `.auth-card`):** centred card, max-width 400px, 20px radius, logo on top.
- **Theme Toggle:** "Modo claro" checkbox in Settings; stored in `localStorage` (`syncro-theme`), dark by default.

# 07 Motion
- Pages, cards, task rows, note cards and empty states enter with a short fade-up (0.4–0.45s), staggered.
- Dialogs, popovers, menus and the toast use short scale/slide entrances (0.2–0.34s).
- Cards and rows lift 2px on hover; buttons scale to 95% when pressed.
- `prefers-reduced-motion: reduce` disables all animations and transitions.

# 08 Icons
- Lucide React, line icons only, 1.5px stroke (20px in navigation, 14–16px inline).
- Emoji are used as markers for special dates and workspace icons (e.g. 🎂, 📝, ✈️).

# 09 Breakpoints
- Small mobile: under 480px (one KPI per row, forms in one column, tags hidden in list rows).
- Narrow: under 640px (note grid in one column, note tools always visible).
- Mobile: up to 760px (floating bottom navigation, one-column finance and home grids).
- Tablet: up to 1100px (KPIs in two columns, home cards in one column).
- Short desktop screens (height up to 820px): compact sidebar spacing so Settings stays visible.

# Rules
- Never use colours outside this palette. Use tokens (`var(--…)`) or `PALETTE` values, not new hex codes.
- Mobile first. The single codebase must render perfectly on phone screens before scaling to PC.
- Always support both Dark and Light modes; light mode only redefines tokens, so style components through tokens.
- Respect `prefers-reduced-motion` for any new animation.
