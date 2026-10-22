#define AppName "Syncro"
#define AppVersion "2.2.0"
#define AppExe "Syncro.exe"

[Setup]
AppId={{B7C1E5A2-4D3F-4A8E-9C61-2F5D8E7A1B34}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#AppExe}
UninstallDisplayName={#AppName}
OutputDir=Output
OutputBaseFilename=SyncroSetup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "portuguese"; MessagesFile: "compiler:Languages\Portuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "Criar atalho no ambiente de trabalho"; Flags: unchecked

[Files]
Source: "*"; DestDir: "{app}"; \
  Excludes: "*.cs,*.iss,*.iml,*.lnk,.idea\*,.git\*,.gitignore,Output\*,out\*,README.md,obj\*,codigo-fonte\*,node_modules\*"; \
  Flags: recursesubdirs createallsubdirs ignoreversion

[InstallDelete]
Type: files; Name: "{app}\index.html"
Type: files; Name: "{userprograms}\Planner.lnk"
Type: files; Name: "{userprograms}\Syncro.lnk"

[Icons]
Name: "{autoprograms}\{#AppName}\{#AppName}"; Filename: "{app}\{#AppExe}"; \
  WorkingDir: "{app}"; IconFilename: "{app}\{#AppExe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExe}"; \
  WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "Abrir o Syncro"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/F /T /IM {#AppExe}"; \
  Flags: runhidden; RunOnceId: "EncerrarSyncro"

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
Type: files; Name: "{userprograms}\Planner.lnk"
Type: files; Name: "{userprograms}\Syncro.lnk"

[Code]
const
  DataDirPlanner = '{localappdata}\Planner';
  DataDirSyncro = '{localappdata}\Syncro';

function HasWebView2Runtime: Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(HKEY_CURRENT_USER,
    'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and
    (Version <> '') and (Version <> '0.0.0.0');
  if not Result then
    Result := RegQueryStringValue(HKEY_LOCAL_MACHINE,
      'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and
      (Version <> '') and (Version <> '0.0.0.0');
  if not Result then
    Result := RegQueryStringValue(HKEY_LOCAL_MACHINE,
      'Software\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and
      (Version <> '') and (Version <> '0.0.0.0');
end;

function InitializeSetup: Boolean;
begin
  Result := True;
  if not HasWebView2Runtime then
  begin
    MsgBox('O Syncro precisa do Microsoft Edge WebView2 Runtime para funcionar.' + #13#10 +
      'Instale-o e execute novamente o instalador: https://go.microsoft.com/fwlink/p/?LinkId=2124703',
      mbError, MB_OK);
    Result := False;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Tentativa: Integer;
  Apagar: Boolean;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if DirExists(ExpandConstant(DataDirPlanner)) or DirExists(ExpandConstant(DataDirSyncro)) then
    begin
      if UninstallSilent then
        Apagar := True
      else
        Apagar := MsgBox(
          'Pretende eliminar também todos os dados do Syncro?' + #13#10 +
          '(eventos, tarefas, finanças, dias especiais e perfil)' + #13#10#13#10 +
          'Esta ação é irreversível.',
          mbConfirmation, MB_YESNO or MB_DEFBUTTON1) = IDYES;

      if Apagar then
      begin
        for Tentativa := 1 to 6 do
        begin
          DelTree(ExpandConstant(DataDirPlanner), True, True, True);
          DelTree(ExpandConstant(DataDirSyncro), True, True, True);
          if not DirExists(ExpandConstant(DataDirPlanner)) and
             not DirExists(ExpandConstant(DataDirSyncro)) then
            Break;
          Sleep(1000);
        end;
      end;
    end;
  end;
end;
