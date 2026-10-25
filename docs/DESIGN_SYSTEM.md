# Design System
# 01 Brand Identity
Elegant, organized, focused, and adaptable (Dark/Light).

## Logo
- Primary logo colour: **Amber `#FFB020`** (symbol blades and SYNCRO lettering).
- Centre dot: **Light amber `#FFE4A3`**.
- Windows icons must have a **transparent background**, including the gaps between the blades. Use a square canvas with the symbol filling approximately **94%** of its dimensions to remain legible in the taskbar; no background tile or shadow.
- Use the same logo colours in both themes, desktop shortcuts, executable icons and installer branding. Preserve the symbol geometry and lettering.
- Source images: `codigo-fonte/src/assets/syncro-symbol.png` and `syncro-logo.png`; Windows icons: `desktop/assets/Syncro.ico` and `Syncro-brand.ico`.
- Transparent Windows master: `desktop/assets/syncro-icon.png`; provide ICO sizes 16, 24, 32, 48, 64, 128 and 256 pixels. The distributed icon uses `Syncro-brand-amber-transparent.ico` to avoid the previous cached background.
- Logo colours are independent of interface accent colours below.

# 02 Colour Palette
| Name | Hex (Dark) | Hex (Light) | Use for |
|------------|---------|---------|-----------------------------|
| Primary Base | #1C1E1E | #FAFAFA | Main app background |
| Surface | #222424 | #FFFFFF | Cards, inputs, and task rows |
| Accent | #EFCB53 | #745C00 | Primary buttons, active states, highlights |
| Brand Amber | #FFB020 | #FFB020 | Logo symbol and lettering |
| Brand Centre | #FFE4A3 | #FFE4A3 | Logo centre dot |
| Text Primary| #F3F4F6 | #111827 | Main text, key UI headings |
| Text Muted | #A4A7A7 | #6B7280 | Secondary text, placeholders |
| Border | #343636 | #E5E7EB | Dividers, input borders |
| Success | #22C55E | #16A34A | Success states, completed tasks |
| Error | #EF4444 | #DC2626 | Errors, destructive actions |

# 03 Typography
- **Font:** Inter
- **H1:** 48px, Bold
- **H2:** 36px, Semibold
- **H3:** 24px, Semibold
- **Body:** 16px, Regular
- **Caption:** 14px, Regular

# 04 Spacing
Use an 8px scale: 4, 8, 16, 24, 32, 48, 64px

# 05 Border Radius
- Small elements (badges, inputs): 8px
- Cards and task rows: 12px
- Buttons: 8px

# 06 Components
- **Primary button:** Accent background, dark text (dark mode) or white text (light mode), 8px radius.
- **Task Row:** Surface background, 1px Border, 12px radius, layout optimized for task name, effort, and priority tags.
- **Inputs:** Surface background, 1px Border border, 8px radius, accent border on focus.
- **Theme Toggle:** Must support seamless switching between the dark (default) and light palettes.

# 07 Icons
Use Lucide React. Line icons only, 1.5px stroke.

# 08 Breakpoints
- Mobile: under 640px
- Tablet: 640px to 1024px
- Desktop: over 1024px

# Rules
- Never use colours outside this palette.
- Mobile first. The single codebase must render perfectly on phone screens before scaling to PC.
- Always support both Dark and Light modes based on user preference.
