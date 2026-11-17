[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw 'No se encontro el compilador .NET Framework de Windows.' }
Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap(48, 48)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([Drawing.Color]::FromArgb(20, 62, 52))
$pen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(209, 183, 125), 3)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.DrawLine($pen, 24, 8, 24, 34)
$graphics.DrawLine($pen, 15, 17, 33, 17)
$graphics.DrawArc($pen, 12, 21, 24, 20, 0, 180)
$icon = [Drawing.Icon]::FromHandle($bitmap.GetHicon())
$iconPath = Join-Path $PSScriptRoot 'launcher.ico'
$stream = [IO.File]::Create($iconPath)
try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose(); $pen.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
$outputPath = Join-Path $projectPath 'Iniciar Sistema.exe'
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /codepage:65001 ('/out:' + $outputPath) ('/win32icon:' + $iconPath) /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll (Join-Path $PSScriptRoot 'Launcher.cs')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el lanzador.' }
Write-Output $outputPath
