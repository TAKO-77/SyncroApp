import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { createHash } from 'node:crypto'

// Run against the compiled .NET Framework executable, without opening the UI or installing anything.
const root = resolve(import.meta.dirname, '..')
const source = readFileSync(join(root, 'desktop/Program.cs'), 'utf8')
const version = source.match(/const string AppVersion = "([\d.]+)"/)?.[1]
assert.ok(version, 'AppVersion missing')
const installer = readFileSync(join(root, 'desktop/installer/Syncro.iss'), 'utf8')
assert.equal(installer.match(/#define AppVersion "([\d.]+)"/)?.[1], version, 'Installer version differs from application')

const asset = { name: 'SyncroSetup.exe', state: 'uploaded', size: 128,
  browser_download_url: 'https://github.com/TAKO-77/SyncroApp/releases/download/v9.0.0/SyncroSetup.exe' }
const release = { tag_name: 'v9.0.0', draft: false, prerelease: false, assets: [asset] }
const cases = [
  { name: 'actual JSON assets array (ArrayList regression)', data: release, current: version, expected: '9.0' },
  { name: 'uppercase V tag', data: { ...release, tag_name: 'V9.0.0', assets: [{ ...asset, browser_download_url: asset.browser_download_url.replace('/v9.', '/V9.') }] }, current: version, expected: '9.0' },
  { name: 'same version', data: release, current: '9.0.0', expected: 'none' },
  { name: 'no downgrade', data: release, current: '10.0.0', expected: 'none' },
  { name: 'equivalent four-part version', data: release, current: '9.0.0.0', expected: 'none' },
  { name: 'equivalent two-part version', data: release, current: '9.0', expected: 'none' },
  { name: 'draft ignored', data: { ...release, draft: true }, current: version, expected: 'none' },
  { name: 'prerelease ignored', data: { ...release, prerelease: true }, current: version, expected: 'none' },
  { name: 'empty assets', data: { ...release, assets: [] }, current: version, expected: 'error' },
  { name: 'null assets', data: { ...release, assets: null }, current: version, expected: 'error' },
  { name: 'missing tag', data: { assets: [asset] }, current: version, expected: 'error' },
  { name: 'invalid tag', data: { ...release, tag_name: 'release-new' }, current: version, expected: 'error' },
  { name: 'installer upload unfinished', data: { ...release, assets: [{ ...asset, state: 'new' }] }, current: version, expected: 'error' },
  { name: 'installer missing', data: { ...release, assets: [{ ...asset, name: 'Source.zip' }] }, current: version, expected: 'error' },
  { name: 'empty installer', data: { ...release, assets: [{ ...asset, size: 0 }] }, current: version, expected: 'error' },
  { name: 'invalid download URL', data: { ...release, assets: [{ ...asset, browser_download_url: 'https://example.com/SyncroSetup.exe' }] }, current: version, expected: 'error' },
  { name: 'HTTPS required', data: { ...release, assets: [{ ...asset, browser_download_url: asset.browser_download_url.replace('https:', 'http:') }] }, current: version, expected: 'error' },
  { name: 'installer from another tag rejected', data: { ...release, assets: [{ ...asset, browser_download_url: asset.browser_download_url.replace('v9.0.0', 'v8.0.0') }] }, current: version, expected: 'error' },
  { name: 'ignore unrelated assets and null entries', data: { ...release, assets: [null, { name: 'Source.zip' }, asset] }, current: version, expected: '9.0' },
].map(test => ({ ...test, json: JSON.stringify(test.data) }))
cases.push({ name: 'malformed JSON', data: release, json: '{', current: version, expected: 'error' })

const fixtureFolder = mkdtempSync(join(root, 'local/updater-test-'))
const good = Buffer.from('MZsyncro-test-download')
const goodPath = join(fixtureFolder, 'valid.exe')
const badPath = join(fixtureFolder, 'invalid.exe')
writeFileSync(goodPath, good)
writeFileSync(badPath, Buffer.from('<html>error</html>'))
const digest = 'sha256:' + createHash('sha256').update(good).digest('hex')
const downloads = [
  { name: 'download without optional digest', path: goodPath, size: good.length, digest: '', error: false },
  { name: 'valid SHA256', path: goodPath, size: good.length, digest, error: false },
  { name: 'truncated download', path: goodPath, size: good.length + 1, digest: '', error: true },
  { name: 'HTML response rejected', path: badPath, size: readFileSync(badPath).length, digest: '', error: true },
  { name: 'SHA256 mismatch', path: goodPath, size: good.length, digest: 'sha256:' + '0'.repeat(64), error: true },
]
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'"
const payloadPath = join(fixtureFolder, 'cases.json')
writeFileSync(payloadPath, JSON.stringify({ cases, downloads }), 'utf8')
const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Web.Extensions
[void][Reflection.Assembly]::LoadFrom(${quote(join(root, 'dist/windows/Microsoft.Web.WebView2.Core.dll'))})
[void][Reflection.Assembly]::LoadFrom(${quote(join(root, 'dist/windows/Microsoft.Web.WebView2.WinForms.dll'))})
$assembly = [Reflection.Assembly]::LoadFrom(${quote(join(root, 'dist/windows/Syncro.exe'))})
if ($assembly.GetName().Version.ToString(3) -ne ${quote(version)}) { throw 'Executable version is stale; rebuild first' }
$type = $assembly.GetType('PlannerWindow', $true)
$flags = [Reflection.BindingFlags]'NonPublic,Static'
$parse = $type.GetMethod('ParseUpdate', $flags)
$validate = $type.GetMethod('ValidateInstaller', $flags)
$payload = Get-Content -LiteralPath ${quote(payloadPath)} -Raw -Encoding UTF8 | ConvertFrom-Json
$passed = 0
foreach ($case in $payload.cases) {
  $failed = $false
  try { $result = $parse.Invoke($null, [object[]]@([string]$case.json, [string]$case.current)) }
  catch { $failed = $true }
  if ($case.expected -eq 'error') { if (-not $failed) { throw ('Expected error: ' + $case.name) } }
  elseif ($failed) { throw ('Unexpected error: ' + $case.name) }
  elseif ($case.expected -eq 'none') { if ($null -ne $result) { throw ('Unexpected update: ' + $case.name) } }
  else {
    if ($null -eq $result) { throw ('Missing update: ' + $case.name) }
    $detected = $result.GetType().GetField('Version').GetValue($result)
    if ($detected.ToString(2) -ne $case.expected) { throw ('Wrong version: ' + $case.name) }
  }
  $passed++
  Write-Output ('PASS ' + $case.name)
}
foreach ($case in $payload.downloads) {
  $failed = $false
  try { $validate.Invoke($null, [object[]]@([string]$case.path, [long]$case.size, [string]$case.digest)) }
  catch { $failed = $true }
  if ($failed -ne $case.error) { throw ('Unexpected validation result: ' + $case.name) }
  $passed++
  Write-Output ('PASS ' + $case.name)
}
Write-Output ('' + $passed + ' updater checks passed; app and installer versions match.')
`
try {
  const shell = join(process.env.WINDIR || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe')
  const result = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true })
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  if (result.error) throw result.error
  assert.equal(result.status, 0, 'Updater tests failed')
} finally {
  assert.equal(dirname(resolve(fixtureFolder)), resolve(root, 'local'), 'Refusing cleanup outside local test directory')
  rmSync(fixtureFolder, { recursive: true })
}
