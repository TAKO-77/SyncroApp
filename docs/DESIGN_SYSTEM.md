# Design System
# 01 Brand Identity
Elegant, organized, focused, and adaptable (Dark/Light).

## Logo
- Primary logo colour: **Amber `#FFB020`** (symbol blades and SYNCRO lettering).
- Centre dot: **Light amber `#FFE4A3`**.
- Windows icons must have a **transparent background**, including the gaps between the blades. Use a square canvas with the symbol filling approximately **94%** of its dimensions to remain legible in the taskbar; no background tile or shadow.
- Use the same logo colours in both themes, desktop shortcuts, executable icons and installer branding. Preserve the symbol geometry and lettering.
- Source images: `codigo-fonte/src/assets/syncro-symbol.png` and `syncro-logo.png`; Windows icons: `desktop/assets/Syncro.ico` and `Syncro-brand.ico`.
- Transparent Windows master: `desktop/assets/syncro-icon.png`; provide ICO sizes 16, 24, 32, 48, 64, 128 and 256 pixels. The build copies `Syncro-brand.ico` as `Syncro-brand-amber-transparent.ico`, which the installer and shortcuts use to avoid the previous cached background.
- In the UI, logo images use the SVG filter `#logo-background` (`LogoFilter` in `components/common.tsx`) to remove their dark background. Render `LogoFilter` wherever the logo appears (sidebar, mobile header, sign-in and desktop-only screens).
- Logo colours are independent of interface accent colours below.

# 02 Colour Palette
All interface colours are CSS custom properties in `codigo-fonte/src/styles.css`. Dark is the default; light is applied with `data-theme="light"` on `<html>`. Most light values are derived with `color-mix`; the resolved hex is listed.

## Core tokens
| Token | Name | Hex (Dark) | Hex (Light) | Use for |
|-------|------|-----------|-------------|---------|
| `--bg` | Primary Base | #1C1E1E | #C9CACA | App background, sidebar, inputs, pickers, note cards |
| `--s1` | Surface | #222424 | #DBDBDB | Cards, task rows, dialogs, popovers, menus, table headers |
| `--s2` | Surface Raised | #2A2C2C | #BEBFBF | Buttons, row and option hover, toolbars, weekend rows |
| `--l1` | Border | #343636 | #AFB0B0 | Dividers, card and row borders, grid lines |
| `--l2` | Border Strong | #454747 | #939494 | Input, button, chip, dialog and popover borders |
| `--tx` | Text Primary | #F3F4F6 | #1C1E1E | Main text, headings |
| `--mu` | Text Muted | #A4A7A7 | #585959 | Labels, secondary text, placeholders, inactive nav |
| `--ac` | Accent | #EFCB53 | #745C00 | Active states, focus, links, highlights, today markers |
| `--accent-text` | On Accent | #1C1E1E | #FFFFFF | Text on accent backgrounds |
| `--accent-soft` | Accent Soft | #3B382A | #D1CEC5 | Active nav item, selected segment, workspace mark, link hover |
| `--hover` | Hover | #2C2E2F | #CFCFCF | Hover on rows and menu options (light) |
| `--success` | Success | #22C55E | #16A34A | Income, positive values, task completion |
| `--error` | Error | #EF4444 | #DC2626 | Errors, overdue, negative values, destructive actions |
| `--brand` | Brand Amber | #FFB020 | #FFB020 | Logo lettering |
| — | Brand Centre | #FFE4A3 | #FFE4A3 | Logo centre dot |

- Primary button in light mode blends both accents: **#8D7211** (hover **#997D19**).

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

- Urgent priority uses `--error`.
- Tinted backgrounds are derived from `--c` with `color-mix` (11–20% over the surface), never with new hex values.

## Remaining fixed values
These are still hard-coded in `styles.css` and should move to tokens when touched:
- `#0B0B0B`: base for the event block tint (dark).
- `#77704F`: border of the selected weekday button.
- `#56657C`: sleep block label (dark).
- `#E5A4A0`: sign-in error text (dark).
- `#FFFFFF`: text on the solid danger button.
- Overlays: dialog backdrop `rgba(5,6,5,.76)` with 8px blur, past-time shade `rgba(0,0,0,.4)`, toolbar backgrounds `rgba(34,36,36,.9)`.

# 03 Typography
Fonts are loaded from Google Fonts in `codigo-fonte/index.html`.

- **Body font:** Manrope (400, 500, 600), fallback `"Segoe UI", system-ui, sans-serif`.
- **Display font:** Cormorant Garamond (500, 600), fallback `Georgia, serif`. Used for headings and large numbers.
- **Brand lettering:** Inter 600, 24px, letter-spacing 0.12em (sidebar "SYNCRO"; not loaded from Google Fonts, falls back to Segoe UI).

| Style | Font | Size / Weight | Use |
|-------|------|---------------|-----|
| Greeting | Cormorant Garamond | clamp(30px, 3vw, 42px) / 500 | Page greeting |
| Display number | Cormorant Garamond | 40–46px / 500 | Focus timer, main finance value |
| H2 | Cormorant Garamond | 30px / 600 | Page titles, sign-in card title |
| Value | Cormorant Garamond | 28–30px / 500 | Finance cards, donut centre |
| Dialog title | Cormorant Garamond | 26px / 600 | Modal headings |
| Range title | Cormorant Garamond | 24px / 500 | Week/month label in toolbars |
| H2 sub | Cormorant Garamond | 20–21px / 600 | Section headings |
| Confirm title | Cormorant Garamond | 18px / 600 | Confirmation dialog |
| Note heading | Manrope | 16px / 600 | Headings inside notes |
| Body | Manrope | 14px / 400, line-height 1.55 | Default text |
| Small | Manrope | 12–13px | Labels, chips, picker options, compact buttons |
| Caption | Manrope | 9–11px | Hour labels, metadata, mobile nav |
| Overline | Manrope | 11px / 600, uppercase, letter-spacing 0.08–0.12em | Section labels (focus timer, upcoming) |

- Numbers that change or align (timer, pickers, sleep duration) use `font-variant-numeric: tabular-nums`.

# 04 Spacing
No strict scale; values sit on a ~4px rhythm.
- Gaps between inline controls: 6–12px.
- Card padding: 12–20px; dialog padding: 24px; sign-in card: 28px × 24px.
- Page padding (desktop): 34px top, `clamp(24px, 4vw, 64px)` sides, 56px bottom.
- Page padding (mobile): 22px top, 14px sides, 90px bottom (space for the bottom nav).
- Narrow pages (settings, profile, tasks): max-width 760px.

# 05 Border Radius
| Element | Radius |
|---------|--------|
| Bars, small markers, drag tooltip | 2–3px |
| Inline code, note toolbar buttons, note icons | 5–7px |
| Sidebar toggle, segmented buttons, calendar nav, images in notes | 8px |
| Chips, weekday buttons, event blocks, list rows, picker and select options | 9px |
| Inputs, textareas, buttons, picker fields | 10px |
| Segmented control, upcoming items | 11px |
| Nav items, toast, note cards, sleep table | 12px |
| Task rows, workspace picker | 13px |
| Finance cards, workspace menu, popovers | 14px |
| Toolbars, notes, empty states | 15px |
| Large cards (timetable, month grid, focus timer, task composer) | 16px |
| Quick add | 17px |
| Dialogs, sign-in card | 18px |
| Effort/priority pill tags | 99px (pill) |
| Avatars, profile button, day numbers, colour dots, checkboxes | 50% |

# 06 Components
## Controls
- **Primary button (`.btn.pri`):** solid Accent background, `--accent-text` text, weight 700, 10px radius. On hover it lifts 1px with an accent glow.
- **Button (`.btn`):** Surface Raised background (Surface in light), 1px Border Strong, 10px radius, 8px × 13px padding; border turns Accent on hover; scales to 95% when pressed. Variants: `.ghost` (transparent, muted text), `.dng` (Error text), `.dng-solid` (solid Error background, white text, used to confirm deletions), `.sq` (36px square icon button).
- **Text inputs and textareas:** Primary Base background, 1px Border Strong, 10px radius; Accent border on focus, no outline.
- **Pickers (`DatePicker`, `TimePicker`, `Select`):** replace native date, time and select controls. The field (`.pk-btn`) looks like an input with an Accent icon; it opens a popover (`.pop`) with a month grid, hour/minute columns or an option list. The selected option has an Accent background; today has an Accent ring. `Select` options can show a colour dot (`--c`) and a check mark.
- **Segmented control (`.seg`):** Primary Base track with 3px padding; selected option uses Accent Soft with Accent text.
- **Chips (`.chip`, `.cp`):** outlined, 9px radius, 8px colour dot from `--c`; selected state uses the category colour as border and a 14% tint.
- **Checkbox (`.ck`):** native checkbox with `accent-color: var(--ac)`.

## Content
- **Task Row (`.tk`):** Surface background, 1px Border, 3px left border in the priority colour, 13px radius, 58px height. Contains a round checkbox, title, time, effort pill tag and delete action. Lifts 2px on hover. Completing a task plays a check pop with a ring and particles, strikes the title, shows "✓ Concluída" and slides the row away.
- **Event block (`.ev`):** 9px radius, 3px left border in the category colour, 15% tint background; resizable from the bottom edge and draggable.
- **Note cards (`.note-card`):** masonry grid (`.note-grid`, min 300px columns), Primary Base background, 12px radius, Accent border while editing. Edit/delete tools appear on hover. Notes support a small markdown subset (headings, lists, checklists, quotes, links, code) and images (`.note-img`, `.note-thumb`).
- **Cards (`.fc`, `.upcoming`, `.pomo`):** Surface background, 1px Border, 14–16px radius.
- **Empty state (`.tem`):** dashed Border Strong, 15px radius, centred muted text.

## Overlays
- **Dialog (`Modal`):** Surface, 1px Border Strong, 18px radius, max-width 440px, large soft shadow, blurred dark backdrop. Opens with a scale-up animation.
- **Confirmation dialog (`ConfirmDialog`):** compact dialog (max-width 380px) used before destructive actions, with a `.dng-solid` confirm button.
- **Quick add:** command-style dialog, max-width 560px, 20px input text, positioned 14% from the top.
- **Popover (`.pop`):** Surface, 1px Border Strong, 14px radius, soft shadow; used by pickers and selects.
- **Toast:** Surface background, Border Strong, 12px radius, centred at the bottom; action link in Accent.

## Layout and screens
- **Sidebar:** collapsible, 68px collapsed and 248px expanded, with optional auto-open on hover. Active item uses Accent Soft background and Accent text (3px inset Accent bar in dark). Holds the sections, the focus timer and Settings.
- **Profile button (`.profile-btn`):** 40px round avatar at the top right of each page; Accent ring when the profile is open.
- **Sign-in and desktop-only screens (`.auth`, `.auth-card`):** centred card, max-width 400px, Surface background, 18px radius, logo on top.
- **Theme Toggle:** "Modo claro" checkbox in Settings; stored in `localStorage` (`syncro-theme`), dark by default.

# 07 Motion
- Pages, task rows, note cards and empty states enter with a short fade-up (0.4–0.45s), staggered by row.
- Dialogs, popovers, menus and the toast use short scale/slide entrances (0.2–0.34s).
- Buttons, chips and pickers transition colour and border in 0.15s and scale to 95% when pressed.
- `prefers-reduced-motion: reduce` disables all animations and transitions.

# 08 Icons
- Use Lucide React for interface icons, line icons only. Navigation icons use a 1.5px stroke at 20px; picker, select and note toolbar icons use Lucide's default stroke at 15–16px.
- Emoji are used as markers for special dates and workspace icons (e.g. 🎂, 📝, ✈️).

# 09 Breakpoints
- Small mobile: under 480px (sleep table and form rows compact).
- Narrow: under 640px (note grid becomes one column, note tools always visible).
- Mobile: up to 760px. The sidebar becomes a fixed bottom navigation bar; brand and focus timer are hidden; grids collapse to one column.
- Desktop: over 760px.
- Short desktop screens (height up to 820px): compact sidebar spacing so Settings stays visible.

# Rules
- Never use colours outside this palette. Use tokens (`var(--…)`) or `PALETTE` values, not new hex codes.
- Mobile first. The single codebase must render perfectly on phone screens before scaling to PC.
- Always support both Dark and Light modes based on user preference.
- Respect `prefers-reduced-motion` for any new animation.
