@echo off
setlocal
cd /d "%~dp0.."

echo [1/3] A compilar a interface...
pushd codigo-fonte
call npm run build
if errorlevel 1 (popd & exit /b 1)
popd

echo [2/3] A preparar dist\windows...
if not exist "dist\windows" mkdir "dist\windows"
copy /y "codigo-fonte\dist\index.html" "dist\windows\index.html" >nul
if errorlevel 1 exit /b 1
xcopy "codigo-fonte\dist\assets" "dist\windows\assets\" /e /i /y >nul
if errorlevel 1 exit /b 1
copy /y "desktop\lib\*.dll" "dist\windows\" >nul
if errorlevel 1 exit /b 1
copy /y "desktop\assets\Syncro-brand.ico" "dist\windows\" >nul
if errorlevel 1 exit /b 1

echo [3/3] A compilar Syncro.exe...
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (echo Nao foi encontrado o csc.exe do .NET Framework.& exit /b 1)
"%CSC%" /nologo /target:winexe /codepage:65001 /win32manifest:desktop\Syncro.manifest /out:dist\windows\Syncro.exe /win32icon:desktop\assets\Syncro.ico /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:desktop\lib\Microsoft.Web.WebView2.Core.dll /reference:desktop\lib\Microsoft.Web.WebView2.WinForms.dll desktop\Program.cs
if errorlevel 1 exit /b 1
echo Build concluido: dist\windows\Syncro.exe
