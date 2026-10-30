# Architecture

## Estado da implementação e organização

Expo + React Native e Supabase continuam a ser a arquitetura pretendida. A migração ainda não foi realizada. A implementação atual usa React/TypeScript com Vite em `codigo-fonte/` e um anfitrião Windows WebView2 em `desktop/Program.cs`. O Supabase já é usado para autenticação (email e palavra-passe) e base de dados, com tabelas por entidade protegidas por RLS (`supabase/migrations/`). A interface é local-first: lê e escreve numa cache local por utilizador, envia as alterações em segundo plano através de uma fila (`codigo-fonte/src/lib/sync/`) e recebe alterações de outros dispositivos por `updated_at`, com eliminações lógicas (`deleted`). Quando uma alteração mexe só em alguns campos de uma linha, a fila envia apenas esses campos sobre a versão atual do servidor, para não apagar o que foi alterado noutro dispositivo (nos campos com várias entradas, como os dias concluídos de um evento repetido, junta entrada a entrada); a app também sincroniza quando volta a ficar visível (`visibilitychange`).

A interface arranca tanto dentro do anfitrião Windows como num navegador normal. A ponte do WebView2 (`lib/desktop.ts`) só existe no anfitrião; sem ela, as funções exclusivas do Windows (versão instalada e procura de atualizações) ficam escondidas. No navegador, a interface é uma PWA (`vite-plugin-pwa` em `vite.config.ts`): o manifesto, o service worker e os ícones (`codigo-fonte/public/icons/`) são gerados no build, e `lib/pwa.ts` regista o service worker só fora do anfitrião Windows, mostrando `components/UpdateBanner.tsx` quando há uma versão nova. O anfitrião Windows copia apenas `index.html` e `assets/`. A versão web é publicada no Cloudflare como Worker com ficheiros estáticos (`codigo-fonte/wrangler.jsonc`), compilado a cada push para o `main`. A página Início (`features/inicio/`) resume as restantes abas usando os mesmos módulos que elas (`lib/finance.ts`, `lib/specialDays.ts` e `lib/tasks.ts`), para que os números coincidam.

- `docs/`: documentação do produto e design.
- `codigo-fonte/src/`: componentes (`components/`), uma pasta por aba (`features/`), estado (`store/`) e utilitários e lógica partilhada (`lib/`).
- `scripts/test-sync.ts` e `scripts/test-updater.ts`: testes dos módulos puros da interface e do atualizador, executados pelo `build.bat`.
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
