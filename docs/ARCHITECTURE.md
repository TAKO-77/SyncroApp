# Architecture

## Estado da implementação e organização

Expo + React Native e Supabase continuam a ser a arquitetura pretendida. A migração ainda não foi realizada. A implementação atual usa React/TypeScript com Vite em `codigo-fonte/` e um anfitrião Windows WebView2 em `desktop/Program.cs`, com dados locais.

- `docs/`: documentação do produto e design.
- `codigo-fonte/src/`: componentes, funcionalidades, estado e utilitários da interface.
- `desktop/assets/`: ícones; `desktop/lib/`: bibliotecas WebView2.
- `desktop/installer/Syncro.iss`: configuração do instalador, que inclui apenas `dist/windows/`.
- `scripts/build.bat`: compila a interface e prepara a aplicação em `dist/windows/`.
- `releases/`: instaladores; `local/`: atalhos específicos da máquina.

As secções seguintes descrevem a arquitetura pretendida para a futura migração.
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
