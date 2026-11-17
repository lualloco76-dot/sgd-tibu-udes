$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $project '.test-artifacts/distribution/toolchain'
New-Item -ItemType Directory -Force -Path $tools | Out-Null
$pythonZip = Join-Path $tools 'python-embed.zip'
$innoSetup = Join-Path $tools 'inno.exe'
Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip' -OutFile $pythonZip
Invoke-WebRequest -Uri 'https://github.com/jrsoftware/issrc/releases/download/is-7_1_1/innosetup-7.1.1-x64.exe' -OutFile $innoSetup
$signature = Get-AuthenticodeSignature -LiteralPath $innoSetup
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notlike '*Pyrsys B.V.*') {
    throw 'La firma del compilador Inno Setup no es válida. No se ejecutará.'
}
$target = Join-Path $tools 'Inno'
Start-Process -FilePath $innoSetup -ArgumentList @('/CURRENTUSER','/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',('/DIR="' + $target + '"')) -WindowStyle Hidden -Wait
if (-not (Test-Path -LiteralPath (Join-Path $target 'ISCC.exe'))) { throw 'Falta el compilador ISCC.exe' }
Write-Host 'Herramientas de compilación preparadas. No se requieren en el equipo destinatario.'
