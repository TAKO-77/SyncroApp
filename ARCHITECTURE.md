# Architecture
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