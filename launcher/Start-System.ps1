[CmdletBinding()]
param(
    [ValidateSet('both', 'backend', 'frontend')][string]$Component = 'both',
    [switch]$NoBrowser,
    [string]$ResultFile
)

$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $projectPath '.test-artifacts\runtime'
New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null
if (-not $ResultFile) { $ResultFile = Join-Path $runtimePath 'launcher-result.json' }
$result = [ordered]@{
    ok = $false; message = ''; url = 'http://localhost:3000'
    backend = @{ status = 'skipped'; pid = $null }
    frontend = @{ status = 'skipped'; pid = $null }
    logs = $runtimePath
}
$stateFile = Join-Path $runtimePath 'launcher-state.json'
$previous = $null
if (Test-Path -LiteralPath $stateFile) {
    try { $previous = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json } catch { }
}

function Read-LocalPage([string]$Address) {
    $response = $null; $reader = $null
    try {
        $request = [System.Net.HttpWebRequest]::Create($Address)
        $request.Proxy = $null
        $request.Timeout = 1800
        $request.ReadWriteTimeout = 1800
        $request.AllowAutoRedirect = $false
        $response = $request.GetResponse()
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
        if ([int]$response.StatusCode -ne 200) { return $null }
        return $reader.ReadToEnd()
    } catch { return $null }
    finally {
        if ($reader) { $reader.Dispose() }
        if ($response) { $response.Dispose() }
    }
}

function Test-BackendIdentity {
    $page = Read-LocalPage 'http://127.0.0.1:8000/'
    return ($null -ne $page -and $page.Contains('API SGD'))
}
function Test-BackendReady {
    $page = Read-LocalPage 'http://127.0.0.1:8000/health'
    if (-not $page) { return $false }
    try { if (($page | ConvertFrom-Json).estado -ne 'disponible') { return $false } } catch { return $false }
    # This query also checks the schema needed by the login, not only SELECT 1.
    return ($null -ne (Read-LocalPage 'http://127.0.0.1:8000/api/auth/parroquias'))
}
function Test-FrontendReady {
    $page = Read-LocalPage 'http://localhost:3000/'
    return ($null -ne $page -and $page.Contains('Archivo diocesano') -and $page.Contains('/src/index.js'))
}
function Test-PortOccupied([int]$Port) {
    try {
        return (@([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object { $_.Port -eq $Port }).Count -gt 0)
    } catch {
        foreach ($hostName in @('127.0.0.1', '::1')) {
            $client = New-Object System.Net.Sockets.TcpClient
            try {
                $pending = $client.BeginConnect($hostName, $Port, $null, $null)
                if ($pending.AsyncWaitHandle.WaitOne(700)) {
                    $client.EndConnect($pending)
                    if ($client.Connected) { return $true }
                }
            } catch { } finally { $client.Close() }
        }
        return $false
    }
}
function Find-Application([string]$Name, [string[]]$Fallbacks) {
    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command -and $command.Source -notlike '*\Microsoft\WindowsApps\*') { return $command.Source }
    foreach ($candidate in $Fallbacks) { if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate } }
    return $null
}
function Find-Python {
    $candidates = @(
        (Join-Path $projectPath '.venv\Scripts\python.exe'),
        (Join-Path $projectPath 'backend\.venv\Scripts\python.exe'),
        (Join-Path $projectPath 'backend\venv\Scripts\python.exe')
    )
    $pythonOnPath = Find-Application 'python.exe' @()
    if ($pythonOnPath) { $candidates += $pythonOnPath }
    foreach ($base in @('HKCU:\SOFTWARE\Python\PythonCore', 'HKLM:\SOFTWARE\Python\PythonCore')) {
        foreach ($entry in @(Get-ChildItem -LiteralPath $base -ErrorAction SilentlyContinue)) {
            try {
                $install = Get-Item -LiteralPath ($entry.PSPath + '\InstallPath') -ErrorAction Stop
                $candidates += (Join-Path $install.GetValue('') 'python.exe')
            } catch { }
        }
    }
    if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'Python312\python.exe') }
    foreach ($candidate in @($candidates | Select-Object -Unique)) {
        if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) { continue }
        $probe = $null
        try {
            # Windows PowerShell 5 can lose ExitCode on Start-Process objects.
            # A directly started .NET Process keeps a valid process handle.
            $info = New-Object System.Diagnostics.ProcessStartInfo
            $info.FileName = $candidate
            $info.Arguments = '-c "import app.main"'
            $info.WorkingDirectory = Join-Path $projectPath 'backend'
            $info.UseShellExecute = $false
            $info.CreateNoWindow = $true
            $info.RedirectStandardOutput = $true
            $info.RedirectStandardError = $true
            $probe = New-Object System.Diagnostics.Process
            $probe.StartInfo = $info
            $probe.Start() | Out-Null
            $stdout = $probe.StandardOutput.ReadToEndAsync()
            $stderr = $probe.StandardError.ReadToEndAsync()
            if (-not $probe.WaitForExit(10000)) { $probe.Kill(); $probe.WaitForExit(); continue }
            [IO.File]::WriteAllText((Join-Path $runtimePath 'python-probe.out.log'), $stdout.Result)
            [IO.File]::WriteAllText((Join-Path $runtimePath 'python-probe.err.log'), $stderr.Result)
            if ($probe.ExitCode -eq 0) { return $candidate }
        } catch { } finally { if ($probe) { $probe.Dispose() } }
    }
    throw 'No se encontro un Python con las dependencias del backend. Consulte el manual tecnico para instalar backend/requirements.txt.'
}
function Previous-Pid([string]$Name) {
    if ($previous -and $previous.$Name -and $previous.$Name.pid) {
        $candidate = Get-Process -Id ([int]$previous.$Name.pid) -ErrorAction SilentlyContinue
        if ($candidate) { return $candidate.Id }
    }
    return $null
}

function Start-Backend {
    if (Test-BackendIdentity) {
        if (-not (Test-BackendReady)) { throw 'El backend esta abierto, pero PostgreSQL o el esquema no responde. Revise PostgreSQL, backend/.env y los registros. No se modifico la base.' }
        return @{ status = 'ready'; pid = (Previous-Pid 'backend') }
    }
    if (Test-PortOccupied 8000) { throw 'El puerto 8000 esta ocupado por otro proceso. El lanzador no lo detendra. Cierre ese programa o revise su configuracion.' }
    $pythonPath = Find-Python
    $process = Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory (Join-Path $projectPath 'backend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'backend.out.log') -RedirectStandardError (Join-Path $runtimePath 'backend.err.log') -PassThru
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($watch.Elapsed.TotalSeconds -lt 35) {
        if ($process.HasExited) { throw 'El backend no pudo iniciar. Abra los registros backend.err.log y python-probe.err.log.' }
        if ((Test-BackendIdentity) -and (Test-BackendReady)) { return @{ status = 'started'; pid = $process.Id } }
        Start-Sleep -Milliseconds 400
    }
    throw 'El backend no respondio a tiempo. Compruebe PostgreSQL y los registros. Los procesos ajenos no se han detenido.'
}
function Start-Frontend {
    if (Test-FrontendReady) { return @{ status = 'ready'; pid = (Previous-Pid 'frontend') } }
    if (Test-PortOccupied 3000) { throw 'El puerto 3000 esta ocupado por otro programa. El lanzador no lo detendra.' }
    $vitePath = Join-Path $projectPath 'frontend\node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Faltan las dependencias del frontend. Ejecute npm ci dentro de frontend y vuelva a abrir el lanzador.' }
    $nodePath = Find-Application 'node.exe' @((Join-Path $env:ProgramFiles 'nodejs\node.exe'))
    if (-not $nodePath) { throw 'No se encontro Node.js. Instale una version compatible segun el manual tecnico.' }
    $process = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $vitePath + '"')) -WorkingDirectory (Join-Path $projectPath 'frontend') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimePath 'frontend.out.log') -RedirectStandardError (Join-Path $runtimePath 'frontend.err.log') -PassThru
    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    while ($watch.Elapsed.TotalSeconds -lt 35) {
        if ($process.HasExited) { throw 'El frontend no pudo iniciar. Revise frontend.err.log y la version de Node.js indicada en el manual.' }
        if (Test-FrontendReady) { return @{ status = 'started'; pid = $process.Id } }
        Start-Sleep -Milliseconds 400
    }
    throw 'El frontend no respondio a tiempo. Revise frontend.err.log y frontend.out.log.'
}

$hasher = [System.Security.Cryptography.SHA256]::Create()
try { $key = ([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectPath.ToLowerInvariant())))).Replace('-', '').Substring(0, 20) } finally { $hasher.Dispose() }
$mutex = New-Object System.Threading.Mutex($false, ('Local\SGD-Tibu-' + $key))
$owned = $false; $exitCode = 1
try {
    try { $owned = $mutex.WaitOne(85000) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
    if (-not $owned) { throw 'Otro lanzador sigue iniciando el sistema. Espere y vuelva a intentarlo.' }
    # Refresh state after the startup lock, so simultaneous launches reuse the same services.
    if (Test-Path -LiteralPath $stateFile) { try { $previous = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json } catch { } }
    if (-not (Test-Path -LiteralPath (Join-Path $projectPath 'backend\app\main.py'))) { throw 'No se encontro la carpeta backend del proyecto.' }
    if ($Component -in @('both', 'backend')) { $result.backend = Start-Backend }
    if ($Component -in @('both', 'frontend')) { $result.frontend = Start-Frontend }
    $result.ok = $true
    $result.message = 'Sistema disponible.'
    $exitCode = 0
    if (-not $NoBrowser -and $Component -ne 'backend') { Start-Process 'http://localhost:3000' | Out-Null }
} catch {
    $result.message = $_.Exception.Message
} finally {
    $json = $result | ConvertTo-Json -Depth 5 -Compress
    $parent = Split-Path -Parent ([IO.Path]::GetFullPath($ResultFile))
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    [IO.File]::WriteAllText([IO.Path]::GetFullPath($ResultFile), $json, (New-Object Text.UTF8Encoding($false)))
    [IO.File]::WriteAllText($stateFile, $json, (New-Object Text.UTF8Encoding($false)))
    if ($owned) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
    Write-Output $json
}
exit $exitCode
