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

Os dados são guardados localmente no perfil do utilizador. Em **Definições → Dados e cópia de segurança**, podes exportar um ficheiro JSON ou importar uma cópia anterior.

O instalador preserva os dados durante as atualizações. Ao desinstalar, podes escolher se pretendes eliminá-los.

## Atualizações

Ao iniciar, o Syncro verifica se existe uma versão mais recente publicada neste repositório. Quando encontra uma atualização, pergunta se queres descarregar e executar o instalador. A aplicação continua a funcionar se não houver ligação à Internet ou se a verificação falhar.

## Desenvolvimento

A interface usa React, TypeScript e Vite. O executável Windows usa WebView2.

### Organização do repositório

```text
docs/                 Requisitos, arquitetura e sistema de design
codigo-fonte/         Código e configuração da interface
desktop/              Código e manifesto da aplicação Windows
  assets/             Ícones da aplicação e do instalador
  lib/                Bibliotecas WebView2 usadas na compilação
  installer/          Configuração do instalador Inno Setup
scripts/              Script de compilação
dist/windows/         Aplicação Windows pronta a executar
releases/             Instaladores gerados
local/                Atalhos locais
```

As pastas de saída, dependências, atalhos e configurações do editor estão no `.gitignore`. Os artefactos já versionados continuam preservados; novas versões devem ser distribuídas através das GitHub Releases.

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

Para executar diretamente, abre `dist/windows/Syncro.exe`. Mantém os ficheiros dessa pasta juntos. Os ícones originais ficam em `desktop/assets/` e as bibliotecas WebView2 em `desktop/lib/`.

## Publicar uma versão

A versão atual é **2.3.0**. Para publicar uma atualização:

1. Define o mesmo novo número em `desktop/Program.cs` (`AppVersion`) e `desktop/installer/Syncro.iss` (`AppVersion`).
2. Fecha o Syncro e executa `scripts/build.bat`.
3. Abre `desktop/installer/Syncro.iss` no Inno Setup e compila o instalador. O resultado fica em `releases/SyncroSetup.exe`.
4. Faz commit e push do código e da documentação. Exclui dependências instaladas, ficheiros temporários e atalhos locais. Os ficheiros gerados são distribuídos no instalador da Release.
5. Cria uma GitHub Release a partir do commit enviado, com uma tag correspondente à versão, por exemplo `v2.3.0`.
6. Anexa o instalador com o nome exato **SyncroSetup.exe**, descreve as alterações e publica como **Latest**.

O número da tag deve coincidir com a versão do executável e do instalador para que a deteção de atualizações funcione corretamente.
