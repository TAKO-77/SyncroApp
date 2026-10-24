# Design System
# 01 Brand Identity
Elegant, organized, focused, and adaptable (Dark/Light).

# 02 Colour Palette
| Name | Hex (Dark) | Hex (Light) | Use for |
|------------|---------|---------|-----------------------------|
| Primary Base | #1C1E1E | #FAFAFA | Main app background |
| Surface | #222424 | #FFFFFF | Cards, inputs, and task rows |
| Accent | #EFCB53 | #745C00 | Primary buttons, active states, highlights |
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
