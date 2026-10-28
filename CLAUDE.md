# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Current stack vs. AGENTS.md

AGENTS.md and `docs/ARCHITECTURE.md` describe the *intended* future stack (Expo + React Native, EAS, Maven). That migration has only just started. The shipped app is still the first four entries below:

- `codigo-fonte/`: React 18 + TypeScript + Vite web UI, state in Zustand, validation with Zod. Supabase provides auth (email + password, required) and the database, and the UI is local-first over a per-user `localStorage` cache (see "Sync" below).
- `supabase/migrations/`: SQL schema with one table per entity, primary key `(user_id, id)`, row level security and soft deletes.
- `desktop/Program.cs`: a single-file C# WinForms host (.NET Framework, compiled with `csc.exe`, not `dotnet`) that embeds the UI in WebView2 and also contains the self-updater. That `csc.exe` only accepts **C# 5**: no string interpolation (`$"..."`), `?.`, `nameof`, `out var` or expression-bodied members.
- `desktop/installer/Syncro.iss`: an Inno Setup installer that packages `dist/windows/`.
- `syncro-app/`: the Expo app the migration targets. It has sign-in and the Tarefas section wired to Supabase; the other sections are placeholders (see "Expo app" below). It is not shipped.

Ignore the Maven and `.puml` instructions. The Vite UI's Supabase config comes from `codigo-fonte/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; see `.env.example`) and is baked in at build time. The rules on UI language (European Portuguese), commits and design apply to both apps.

## Commands

UI only (run in `codigo-fonte/`):
```powershell
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build; this is the only type-check/lint step
```

There is no lint config and no test runner for the UI. The sync mapping is tested by a plain Node script (`node scripts/test-sync.ts`, from the repo root), and the Expo app's task logic by `node scripts/test-tasks.ts`.

Full Windows build (from the repo root; close the running Syncro first or `Syncro.exe` can't be overwritten):
```powershell
.\scripts\build.bat
```
`build.bat` runs four steps: build the UI, copy `index.html`, `assets/`, the WebView2 DLLs and the icons into `dist/windows/`, compile `Syncro.exe` with `csc.exe`, then run `node scripts/test-updater.ts` and `node scripts/test-sync.ts`.

Updater tests only (needs Node ≥ 22.18 for native `.ts` execution, plus a built `dist/windows/Syncro.exe`):
```powershell
node scripts/test-updater.ts
```
These are table-driven cases run against the compiled executable. They also assert that `AppVersion` in `Program.cs` matches `#define AppVersion` in `Syncro.iss`. To run one case, filter the `cases` array locally; there is no CLI filter.

Installer: compile `desktop/installer/Syncro.iss` with Inno Setup's `ISCC.exe`; the output is `releases/SyncroSetup.exe`. It refuses to compile if `dist/windows/Syncro.exe` is missing or its file version differs from `AppVersion`.

## Releasing

The version is defined in two places that must match: `AppVersion` in `desktop/Program.cs` and `#define AppVersion` in `desktop/installer/Syncro.iss`. The updater only accepts stable GitHub Releases on `TAKO-77/SyncroApp`. A release needs a numeric tag (`v2.3.2`) and an asset named exactly `SyncroSetup.exe`. The full checklist is in the README under "Publicar uma versão"; the release itself can be created with `gh release create vX.Y.Z releases/SyncroSetup.exe --title "Syncro X.Y.Z" --latest`.

## UI architecture (`codigo-fonte/src`)

- **One local document per user.** In the UI, all user data is a single `AppData` object (`types.ts`), cached as JSON under `syncro-data:<userId>`. `wayne` holds the data saved before accounts existed. It is offered for upload on the first sign-in and then moved to `wayne-migrated`. UI preferences (theme, sidebar auto-open, focus timer) are device-wide `syncro-*` keys in `store/useStore.ts`.
- **All mutations go through `useStore().update(fn)`.** It `structuredClone`s the data, lets `fn` mutate the clone, persists it, pushes the previous state onto a 30-entry undo `history`, and notifies the sync engine. Never mutate `data` directly. Use `hydrate`/`applyRemote` only for data that must *not* be uploaded.
- **`lib/schema.ts` is the single entry point for loading and importing data.** `parseAppData` validates it with Zod (`.passthrough()`, so unknown legacy fields such as `cl` survive) and fills defaults. It also migrates older shapes, for example `lv` → `effort`, guaranteeing the `geral` workspace, and `harmonizeDefaultColor`. When you add a field to `AppData`, add a default here so existing users' data and imported backups keep loading.
- **Navigation** is local state in `App.tsx`. There is no router, and keys `1`–`6` switch sections. Each section is a single component in `features/<area>/`. Shared pieces live in `components/`: `Modal`, `uid`, `todayIso` and `LogoFilter` are in `common.tsx`, and `CategoryManager` is used by both Agenda (`cats`) and Calendário (`dayCats`). `LogoFilter` is the SVG filter that makes the logo PNG's dark background transparent; render it wherever `filter:url(#logo-background)` is used.
- **Domain conventions:**
  - Dates are ISO `YYYY-MM-DD` strings and times are `HH:MM`; helpers are in `lib/dates.ts`.
  - Recurring events expand per day via `lib/recurrence.ts`. Per-occurrence edits live in `PEvent.ex[date]` and completion in `PEvent.done[date]`.
  - Events copy their category's `color`.
  - Workspace notes (`notes`) are separate boxes per workspace (`workspaceId`), edited in `features/tarefas/NoteCard.tsx` and rendered as a small markdown subset by `NoteContent.tsx`. The old single `taskNotes` string per workspace is migrated by `parseAppData` into a note with id `n-<workspace id>`.
- **Use the themed controls, not the native ones.** `components/DatePicker.tsx` (`DatePicker`, `MonthPicker`), `TimePicker.tsx` and `Select.tsx` replace `<input type=date|month|time>` and `<select>`. All three are built on `Picker.tsx`, which renders its popover into `body`, so modals and `overflow:hidden` don't clip it. Use `confirmDialog()` from `store/confirm.ts` (rendered by `ConfirmDialog` in `main.tsx`) instead of `window.confirm`, which WebView2 shows as "planner.local diz…".
- **Styling** is one global `styles.css` with terse class names, and colours are CSS variables on `:root`. Light mode overrides live under `[data-theme=light]` (set on `<html>` from the store). Every new UI element must work in both themes. The shared category colours are in `lib/palette.ts`. Entrance animations use `animation-fill-mode: backwards`, never `both`/`forwards`: a finished animation would otherwise override the inline `transform` that task drag-and-drop writes on `.tk` rows. Completing a task delays the `done` update by `COMPLETE_MS` in `Tarefas.tsx` so the completion animation can play.

## Auth and sync (`features/auth/`, `store/useAuth.ts`, `lib/sync/`)

- `main.tsx` wraps `App` in `AccountGate`: it shows the sign-in flow (`AuthScreen`), then `startSync(userId)`, and only renders the app once data is loaded. Sign-in uses email + password, and confirmation and password recovery use emailed OTP codes; magic links don't work inside WebView2. There is no OAuth sign-in.
- `lib/sync/rows.ts` is pure (type-only imports; tested by `node scripts/test-sync.ts`). It maps `AppData` ↔ table rows (`toRows`/`fromRows`), diffs two snapshots into row upserts and soft deletes (`diffRows`), and merges pulled rows (`applyRemote`). Array order is stored as `position`. Workspace notes live in `workspace_notes` (`workspaces.notes` is the legacy column), and name/photo/sleep live in `profiles`.
- `lib/sync/engine.ts` keeps an outbox per user in `localStorage` (coalesced by `table:id`, flushed ~600 ms after a change). It uploads with `upsert` on `(user_id, id)` and pulls by `updated_at`, with a 2-minute overlap, on start, on focus, when coming back online and every 60 s. Rows with pending local changes are never overwritten by a pull. Constraint errors (`22xxx`/`23xxx`) are dropped into a `syncro-rejected:<userId>` log; everything else is retried with backoff.
- Schema changes reach the hosted project with `npx supabase db push` (the repo is linked with `supabase link`). Never run `supabase config push`: `supabase/config.toml` is the CLI default and would overwrite the dashboard's auth settings (SMTP, email templates with `{{ .Token }}`, providers).
- **Adding a field to `AppData`** means changing four places: add a column in a new migration under `supabase/migrations/`, map it in `toRows`/`fromRows`/`FIELDS`, add a default in `lib/schema.ts`, and extend `scripts/test-sync.ts`.

## Expo app (`syncro-app/`)

Expo SDK 58 with Expo Router. Routes live in `src/app/`, and `@/*` maps to `src/`. Expo changes between SDKs, so check the versioned docs (https://docs.expo.dev/llms.txt) before using an Expo API from memory.

```powershell
npx expo install <package>   # never npm install: picks SDK-compatible versions
npm run typecheck            # tsc --noEmit; there is no lint or test setup yet
npx expo-doctor
npx expo start --web         # PC version in the browser
npx expo start --lan         # phone, via Expo Go
```

- `src/app/(tabs)/_layout.tsx` is the single navigator for all sizes. It uses `expo-router/ui` `Tabs`: a hidden `TabList` declares the routes, and the visible `SideNav`/`BottomNav` (`components/AppNav.tsx`) reuse their `name`s. The bottom bar shows under 640px, the icon rail up to 1024px and the labelled sidebar above (`hooks/useBreakpoint.ts`). The sections are listed in `lib/sections.ts`.
- Supabase config comes from `syncro-app/.env` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`; see `.env.example`). The client (`lib/supabase.ts`) keeps the session in AsyncStorage. `hooks/useAuth.tsx` holds the session, and `app/_layout.tsx` uses `Stack.Protected` to show `entrar.tsx` (same sign-in/OTP flow as the web `AuthScreen`) or the tabs.
- Unlike the web app, the Expo app talks to the tables directly (no local cache or outbox yet). It writes the same rows as `lib/sync/rows.ts`, so both apps see each other's changes. Tarefas: `lib/tasks.ts` is pure (row mapping, validation, sorting, dates; tested by `scripts/test-tasks.ts`), `lib/tasksApi.ts` has the queries (upsert on `(user_id, id)`, soft deletes), and `hooks/useTasks.ts` applies changes optimistically, reloads on failure, and refreshes on start, on app focus and every 60 s. Workspace notes are not migrated yet.
- Use `Dialog`/`ConfirmDialog` instead of `Alert.alert` (it does nothing on the web), `DateField` for dates, and `TextField`/`Button`/`Chip` for form controls.
- Colours, spacing, radius, Inter font families and type scale come from `lib/theme.ts`, which mirrors `docs/DESIGN_SYSTEM.md`. Styling is `StyleSheet` with these tokens, not NativeWind. Use `AppText` rather than `Text`, because React Native needs one font family per weight. `hooks/useTheme.tsx` holds the theme preference (dark by default; `system`/`dark`/`light` saved under `syncro-theme`).
- Expo Go refuses the project when it is signed in to an Expo account and the CLI isn't. On Windows the default browser `npx expo login` fails (the URL's `&` breaks `cmd /c start`), so set `EXPO_TOKEN` (an access token from expo.dev) in the shell that runs `npx expo start`. If the machine has several network adapters, set `REACT_NATIVE_PACKAGER_HOSTNAME` to the Wi-Fi IP.

## Desktop host (`desktop/Program.cs`)

- The UI is served from the virtual host `https://planner.local/` mapped to the exe folder. If that folder has no `index.html`, it falls back to `./dist`.
- WebView2 profile/data: `%LOCALAPPDATA%\Planner\WebView2`. The folder is named "Planner" to preserve old data, so don't change it. The updater log is `%LOCALAPPDATA%\Syncro\updates.log`.
- JS ↔ host messaging uses `window.chrome.webview.postMessage` with string messages (`syncro:version`, `syncro:check-for-updates`). The host replies with `{ type: 'syncro:update-status', ... }`; see `features/perfil/Definicoes.tsx`. Feature-detect `window.chrome?.webview` so the UI still runs in a normal browser.
- `NewWindowRequested` is always handled by the host: only `http`/`https` URLs are opened, in the default browser. Links that should leave the app need `target="_blank"`.
