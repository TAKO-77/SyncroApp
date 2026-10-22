# Syncro para Windows

Abre `Syncro.exe` para usar o Syncro numa janela própria. A barra de título acompanha a paleta escura da aplicação.

Os eventos aceitam qualquer minuto. Podes escrever a hora no campo ou posicionar/redimensionar um evento no calendário.

Mantém `Syncro.exe`, `index.html` e as DLLs WebView2 desta pasta juntos. `Syncro.ico` é o símbolo usado ao compilar a aplicação.

## Atualizações

O Syncro verifica ao iniciar se existe uma versão mais recente na GitHub Release mais recente deste repositório. Se encontrar uma versão nova, pergunta se queres descarregar e executar o instalador. A verificação falhar ou não haver ligação não impede a utilização da app.

Para publicar uma atualização:

1. Atualiza a versão em `Program.cs` (`AppVersion`) e em `Syncro.iss` (`AppVersion`) para o mesmo número, por exemplo `2.2.0`.
2. Executa `build.bat` e compila `Syncro.iss` com o Inno Setup.
3. Cria uma GitHub Release com a tag `v2.2.0` e anexa o instalador com o nome exato `SyncroSetup.exe`.

O instalador substitui os ficheiros da aplicação instalada. Os dados do utilizador ficam guardados no perfil local e são preservados.
