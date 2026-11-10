# Architecture

## Current implementation and layout

Expo + React Native with Supabase is still the intended architecture. The migration has not happened yet. The current implementation uses React/TypeScript with Vite in `codigo-fonte/` and a Windows WebView2 host in `desktop/Program.cs`. Supabase is already used for authentication (email and password) and the database, with one table per entity protected by RLS (`supabase/migrations/`). The UI is local-first: it reads and writes a per-user local cache, sends changes in the background through a queue (`codigo-fonte/src/lib/sync/`) and receives changes from other devices by `updated_at`, with soft deletes (`deleted`). When a change touches only some columns of a row, the queue sends only those columns over the server's current version, so edits made on another device are not lost (columns holding several entries, such as the completed days of a repeating event, are merged entry by entry); the app also syncs when it becomes visible again (`visibilitychange`). A subtask is an ordinary `tasks` row with `parent_id`, so it syncs and notifies like any task.

The UI starts both inside the Windows host and in a normal browser. The WebView2 bridge (`lib/desktop.ts`) only exists in the host; without it, the Windows-only features (installed version and update check) are hidden. In the browser, the UI is a PWA (`vite-plugin-pwa` in `vite.config.ts`): the manifest, the service worker and the icons (`codigo-fonte/public/icons/`) are generated at build time, and `lib/pwa.ts` registers the service worker only outside the Windows host, showing `components/UpdateBanner.tsx` when a new version is available. The Windows host copies only `index.html` and `assets/`. The web version is published on Cloudflare as a Worker with static assets (`codigo-fonte/wrangler.jsonc`), built on every push to `main`. The Home page (`features/inicio/`) sums up the other tabs using the same modules they use (`lib/finance.ts`, `lib/specialDays.ts` and `lib/tasks.ts`), so the numbers match. All UI text is in `lib/i18n/`, in Portuguese, English, German and French; the language is chosen per account.

- `docs/`: product and design documentation.
- `codigo-fonte/src/`: components (`components/`), one folder per tab (`features/`), state (`store/`), and utilities and shared logic (`lib/`).
- `scripts/test-sync.ts` and `scripts/test-updater.ts`: tests of the UI's pure modules and of the updater, run by `build.bat`.
- `desktop/assets/`: icons; `desktop/lib/`: WebView2 libraries.
- `desktop/installer/Syncro.iss`: installer configuration, which includes only `dist/windows/`.
- `scripts/build.bat`: builds the UI and prepares the app in `dist/windows/`.
- `releases/`: installers; `local/`: machine-specific shortcuts.

The following sections describe the intended architecture for the future migration.
# 01 System Overview
One Codebase (Expo + React Native) → Supabase (Backend, Auth, Database)

# 02 Tech Stack
| Area | Tool |
|------------|---------------------------------------|
| Framework | Expo + React Native |
| Language | JavaScript / TypeScript |
| UI/Styling | NativeWind (Tailwind for React Native) or StyleSheet |
| Backend | Supabase (database, auth, storage) |
| Builds | Cloud Builds via EAS |
| Packages | npm ecosystem |

# 03 Project Structure
syncro-app/
├ app/ # Expo Router pages and navigation
├ components/ # Reusable UI components (Buttons, TaskRows)
├ lib/ # Utilities, Supabase client config
├ hooks/ # Custom React hooks (e.g., useTheme)
├ types/ # TypeScript types and interfaces
├ assets/ # Images, fonts, and static files
└ docs/ # Project documentation

# 04 Data Flow
1. User interacts with the Expo app on PC or Mobile.
2. App reads/writes data to the Supabase backend.
3. Supabase processes auth and database transactions.
4. Real-time or standard responses return to the app.
5. UI updates via React state, utilizing hot reload during development.

# 05 Scalability
- Keep features in separate, modular components.
- Maintain strict TypeScript interfaces for Supabase database tables.
- Leverage EAS for smooth deployments across iOS, Android, and Web/PC from the single codebase.
