@echo off
setlocal
cd /d "%~dp0"

echo [1/3] A compilar a interface...
pushd codigo-fonte
call npm run build
if errorlevel 1 (popd & exit /b 1)
popd

echo [2/3] A atualizar os ficheiros da aplicacao...
if exist assets rmdir /s /q assets
copy /y "codigo-fonte\dist\index.html" "index.html" >nul
xcopy "codigo-fonte\dist\assets" "assets\" /e /i /y >nul
if errorlevel 1 exit /b 1

echo [3/3] A compilar Syncro.exe...
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (echo Nao foi encontrado o csc.exe do .NET Framework.& exit /b 1)
"%CSC%" /nologo /target:winexe /codepage:65001 /win32manifest:Syncro.manifest /out:Syncro.exe /win32icon:Syncro.ico /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:Microsoft.Web.WebView2.Core.dll /reference:Microsoft.Web.WebView2.WinForms.dll Program.cs
if errorlevel 1 exit /b 1
echo Build concluido.
