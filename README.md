# Syncro para Windows

O Syncro reúne a agenda, o calendário, as tarefas e as finanças numa aplicação para organizar o dia a dia.

## Instalar

1. Abre a [versão mais recente](https://github.com/TAKO-77/SyncroApp/releases/latest).
2. Descarrega e executa **SyncroSetup.exe**.
3. Abre o Syncro pelo menu Iniciar ou pelo atalho criado durante a instalação.

A aplicação requer o Microsoft Edge WebView2 Runtime. O instalador verifica se está disponível e indica como o instalar, caso seja necessário.

## Funcionalidades

- **Agenda:** planeamento diário e semanal, categorias e eventos recorrentes. Podes definir horários ao minuto, arrastar e redimensionar eventos.
- **Calendário:** dias especiais, aniversários e uma lista com as marcações dos próximos 31 dias.
- **Tarefas:** prioridades, esforço estimado, datas limite, espaços de trabalho e notas.
- **Finanças:** registo de receitas e despesas, incluindo movimentos recorrentes.
- **Perfil:** nome, foto, horários de sono para cada dia da semana e distribuição do tempo. Podes aplicar o horário de um dia à semana toda.
- **Definições:** modo claro ou escuro, abertura automática da barra lateral e importação/exportação de cópias de segurança.

A barra lateral pode abrir ao passar o rato ou através do botão manual. Os ícones permitem mudar de aba com a barra fechada. Em ecrãs pequenos, a navegação aparece no fundo.

## Dados e cópias de segurança

É necessário iniciar sessão com uma conta (email e palavra-passe). Os dados de cada conta são guardados no Supabase e mantidos em cache no computador: as alterações aparecem de imediato, são enviadas em segundo plano e continuam guardadas localmente se não houver ligação à Internet. O primeiro início de sessão num computador precisa de ligação.

No primeiro início de sessão, os dados guardados neste computador antes das contas são enviados para a conta, se esta estiver vazia. Se a conta já tiver dados, o Syncro pergunta se queres juntá-los, manter só os da conta ou substituí-los pelos do computador.

Em **Definições → Conta**, podes ver o estado da sincronização, sincronizar manualmente e terminar sessão. Em **Definições → Dados e cópia de segurança**, podes exportar um ficheiro JSON ou importar uma cópia anterior.

O instalador preserva os dados durante as atualizações. Ao desinstalar, podes escolher se pretendes eliminá-los.

## Atualizações

Ao iniciar, o Syncro verifica se existe uma versão mais recente publicada neste repositório. Quando encontra uma atualização, pergunta se queres descarregar e executar o instalador. A aplicação continua a funcionar se não houver ligação à Internet ou se a verificação falhar.

Em **Definições → Atualizações**, podes consultar a versão instalada, procurar atualizações manualmente e abrir a página de releases. A procura manual mostra o resultado e eventuais erros. A app só fecha depois de descarregar, validar e conseguir abrir o instalador, que reutiliza a pasta de instalação atual.

O atualizador usa apenas releases públicas estáveis, com tag numérica (`v2.3.2` ou `V2.3.2`) e um anexo chamado **SyncroSetup.exe**. Confirma o tamanho do download e, quando fornecido pelo GitHub, o SHA-256. As falhas ficam registadas em `%LOCALAPPDATA%\Syncro\updates.log`.

**Versões 2.3.0 e 2.3.1:** têm um erro na leitura dos anexos da release. É necessário descarregar e instalar manualmente a versão 2.3.2 uma vez, por cima da instalação existente, sem desinstalar. As atualizações futuras passam a usar o atualizador corrigido.

## Desenvolvimento

A interface usa React, TypeScript e Vite. O executável Windows usa WebView2.

A compilação e os testes requerem Node.js 22.18 ou superior (suporte nativo a scripts TypeScript) e o .NET Framework do Windows. O instalador é compilado com Inno Setup.

### Organização do repositório

```text
docs/                 Requisitos, arquitetura e sistema de design
codigo-fonte/         Código e configuração da interface
desktop/              Código e manifesto da aplicação Windows
  assets/             Ícones da aplicação e do instalador
  lib/                Bibliotecas WebView2 usadas na compilação
  installer/          Configuração do instalador Inno Setup
scripts/              Script de compilação e testes
supabase/migrations/  Esquema da base de dados (tabelas e políticas RLS)
dist/windows/         Aplicação Windows pronta a executar
releases/             Instaladores gerados
local/                Atalhos locais
```

As pastas de saída, dependências, atalhos e configurações do editor estão no `.gitignore`. Os artefactos já versionados continuam preservados; novas versões devem ser distribuídas através das GitHub Releases.

### Base de dados (Supabase)

1. Cria um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, executa o conteúdo de `supabase/migrations/20261025000000_initial_schema.sql`.
3. Em **Authentication → Sign In / Providers → Email**, mantém **Confirm email** ativo.
4. Em **Authentication → Emails**, altera os modelos **Confirm signup** e **Reset password** para incluírem o código `{{ .Token }}`. A aplicação pede o código; as ligações dos emails não funcionam dentro da app Windows.
5. Em **Authentication → URL Configuration**, adiciona aos **Redirect URLs** `http://127.0.0.1:47821/auth/callback` (app Windows) e `http://localhost:5173` (desenvolvimento). Só é necessário para o início de sessão com Google, que se ativa em **Authentication → Sign In / Providers**; os botões só aparecem para os fornecedores ativos.
6. Copia `codigo-fonte/.env.example` para `codigo-fonte/.env` e preenche `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores de **Project Settings → API**. Nunca uses a chave `service_role`.

O `.env` é lido durante a compilação, por isso volta a executar `npm run build` ou `scripts/build.bat` depois de o alterar. Para testar apenas o mapeamento da sincronização: `node scripts/test-sync.ts`.

Para executar a interface em desenvolvimento:

```powershell
cd codigo-fonte
npm install
npm run dev
```

Para compilar a aplicação Windows, fecha o Syncro e executa na pasta principal:

```powershell
.\scripts\build.bat
```

Este comando compila a interface e prepara `dist/windows/` com o executável e os ficheiros necessários. A compilação do executável requer o compilador C# do .NET Framework.

No final, executa os testes do atualizador contra o executável compilado e confirma que a versão da app coincide com a do instalador. Para repetir apenas esses testes: `node scripts/test-updater.ts`. Os testes usam respostas simuladas e downloads locais; não abrem a app nem executam instaladores.

Para executar diretamente, abre `dist/windows/Syncro.exe`. Mantém os ficheiros dessa pasta juntos. Os ícones originais ficam em `desktop/assets/` e as bibliotecas WebView2 em `desktop/lib/`.

## Publicar uma versão

A versão preparada é **2.4.0**. Para publicar uma atualização:

1. Define o mesmo novo número em `desktop/Program.cs` (`AppVersion`) e `desktop/installer/Syncro.iss` (`AppVersion`).
2. Fecha o Syncro e executa `scripts/build.bat`.
3. Abre `desktop/installer/Syncro.iss` no Inno Setup e compila o instalador. O resultado fica em `releases/SyncroSetup.exe`.
4. Faz commit e push do código e da documentação. Exclui dependências instaladas, ficheiros temporários e atalhos locais. Os ficheiros gerados são distribuídos no instalador da Release.
5. Cria uma GitHub Release a partir do commit enviado, com uma tag correspondente à versão, por exemplo `v2.3.2`.
6. Anexa o **novo** `releases/SyncroSetup.exe`, com o nome exato **SyncroSetup.exe**, descreve as alterações e publica como **Latest**. Não marques como draft ou pre-release. Só enviar commits ou criar uma tag não disponibiliza o instalador à app.

O número da tag deve coincidir com a versão do executável e do instalador para que a deteção de atualizações funcione corretamente.

O Inno Setup recusa compilar se a versão do executável for diferente da declarada no instalador, evitando publicar um instalador com um executável antigo. Antes de publicar, confirma a instalação por cima de uma versão anterior e a opção **Procurar atualizações**. Na release 2.3.2, indica que a instalação manual inicial é necessária para quem usa 2.3.0/2.3.1.
