$ErrorActionPreference = 'Stop'
$runtimePath = Join-Path $PSScriptRoot '../../ToeicMindBE/ToeicMind/artifacts/admin-audit-runtime/runtime.json'
$runtime = Get-Content -LiteralPath $runtimePath -Raw | ConvertFrom-Json
if ($runtime.database -notmatch '^ToeicMind_AdminAudit_[a-f0-9]{32}$') { throw 'Refusing to clean a database outside the audit namespace.' }
& python (Join-Path $PSScriptRoot 'cleanup-audit-media.py')
if ($LASTEXITCODE) { throw 'Media cleanup failed; keep the audit database for recovery.' }
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$($runtime.processId)"
if ($process) {
    if ($process.CommandLine -notlike '*artifacts/admin-audit/bin/ToeicMind/debug/ToeicMind.dll*') { throw 'Audit process identity changed; refusing to stop it.' }
    Stop-Process -Id $runtime.processId
}
$database = $runtime.database
& sqlcmd -S localhost -E -C -d master -b -Q "IF DB_ID(N'$database') IS NOT NULL BEGIN ALTER DATABASE [$database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$database]; END" | Out-Null
if ($LASTEXITCODE) { throw 'Audit database cleanup failed.' }
Write-Output 'Audit backend stopped and its isolated database removed.'
