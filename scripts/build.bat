@echo off
setlocal
cd /d "%~dp0.."

echo [1/4] A compilar a interface...
pushd codigo-fonte
call npm run build
if errorlevel 1 (popd & exit /b 1)
popd

echo [2/4] A preparar dist\windows...
if not exist "dist\windows" mkdir "dist\windows"
copy /y "codigo-fonte\dist\index.html" "dist\windows\index.html" >nul
if errorlevel 1 exit /b 1
rem Replace only generated assets so old bundles are not included in the next installer.
node -e "const fs=require('node:fs'),p=require('node:path');const root=p.resolve('dist/windows'),src=p.resolve('codigo-fonte/dist/assets'),dest=p.resolve(root,'assets');if(!root.startsWith(process.cwd()+p.sep)||p.dirname(dest)!==root||fs.lstatSync(root).isSymbolicLink()||(fs.existsSync(dest)&&fs.lstatSync(dest).isSymbolicLink())||!fs.existsSync(src))throw Error('Unsafe assets path');fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(src,dest,{recursive:true});"
if errorlevel 1 exit /b 1
copy /y "desktop\lib\*.dll" "dist\windows\" >nul
if errorlevel 1 exit /b 1
copy /y "desktop\assets\Syncro-brand.ico" "dist\windows\" >nul
if errorlevel 1 exit /b 1
copy /y "desktop\assets\Syncro-brand.ico" "dist\windows\Syncro-brand-amber-transparent.ico" >nul
if errorlevel 1 exit /b 1

echo [3/4] A compilar Syncro.exe...
set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%CSC%" (echo Nao foi encontrado o csc.exe do .NET Framework.& exit /b 1)
"%CSC%" /nologo /target:winexe /codepage:65001 /win32manifest:desktop\Syncro.manifest /out:dist\windows\Syncro.exe /win32icon:desktop\assets\Syncro.ico /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:desktop\lib\Microsoft.Web.WebView2.Core.dll /reference:desktop\lib\Microsoft.Web.WebView2.WinForms.dll desktop\Program.cs
if errorlevel 1 exit /b 1
echo [4/4] A testar o atualizador...
node scripts\test-updater.ts
if errorlevel 1 exit /b 1
echo Build concluido: dist\windows\Syncro.exe
