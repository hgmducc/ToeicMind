param([int]$Port = 5078)
$ErrorActionPreference = 'Stop'
$backend = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../ToeicMindBE/ToeicMind'))
$database = 'ToeicMind_AdminAudit_' + [Guid]::NewGuid().ToString('N')
$output = Join-Path $backend 'artifacts/admin-audit-runtime'
New-Item -ItemType Directory -Force -Path $output | Out-Null
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "Port $Port is already in use." }
& sqlcmd -S localhost -E -C -d master -b -Q "CREATE DATABASE [$database]; ALTER DATABASE [$database] SET AUTO_CLOSE OFF;" | Out-Null
if ($LASTEXITCODE) { throw 'Cannot create isolated audit database.' }
foreach ($file in @('01_schema.sql', '02_views_procs_triggers.sql', '03_seed.sql')) {
    $source = [IO.File]::ReadAllText((Join-Path $backend "../DATABASE/$file"))
    $source = [regex]::Replace($source, '(?im)^\s*USE\s+\[?ToeicDb\]?\s*;\s*$', '')
    if ($source -match '(?im)^\s*USE\b|^\s*(CREATE|DROP)\s+DATABASE\b') { throw 'Audit scripts must not switch, create or drop databases.' }
    $testScript = Join-Path $output $file
    [IO.File]::WriteAllText($testScript, $source, [Text.UTF8Encoding]::new($true))
    & sqlcmd -S localhost -E -C -d $database -b -f 65001 -i $testScript | Out-Null
    if ($LASTEXITCODE) { throw "Failed applying $file to isolated database." }
}
& sqlcmd -S localhost -E -C -d $database -b -Q "IF OBJECT_ID(N'dbo.Users') IS NULL OR (SELECT COUNT(*) FROM sys.tables) <> 34 THROW 51000, 'Audit database initialization failed', 1;" | Out-Null
if ($LASTEXITCODE) { throw 'Audit database schema verification failed.' }
$env:ConnectionStrings__DefaultConnection = "Server=localhost;Database=$database;Integrated Security=True;TrustServerCertificate=True"
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = "http://127.0.0.1:$Port"
$keyBytes = New-Object byte[] 64
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($keyBytes)
$random.Dispose()
$env:Jwt__Key = [Convert]::ToBase64String($keyBytes)
$env:Jwt__Issuer = 'ToeicMind.AdminAudit'
$env:Jwt__Audience = 'ToeicMind.AdminAudit.Client'
$env:Jwt__ExpireMinutes = '15'
$env:Jwt__RefreshTokenDays = '1'
$process = Start-Process dotnet -ArgumentList @('artifacts/admin-audit/bin/ToeicMind/debug/ToeicMind.dll') -WorkingDirectory $backend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $output 'stdout.log') -RedirectStandardError (Join-Path $output 'stderr.log')
@{ database = $database; port = $Port; processId = $process.Id } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $output 'runtime.json')
$ready = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try { Invoke-WebRequest "http://127.0.0.1:$Port/api/auth/me" -UseBasicParsing -TimeoutSec 2 | Out-Null }
    catch { if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { $ready = $true; break } }
    Start-Sleep -Milliseconds 200
}
if (-not $ready) { throw 'Audit backend did not become ready; inspect its local runtime log.' }
Write-Output "Audit backend PID $($process.Id), port $Port; isolated database $database."
