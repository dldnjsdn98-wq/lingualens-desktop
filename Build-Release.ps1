param([string]$NodePath)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$version = (Get-Content (Join-Path $root 'version.txt') -Raw).Trim()
$folder = Join-Path $root 'release\LinguaLens'
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $root 'release'))
$resolved = [IO.Path]::GetFullPath($folder)
if (!$resolved.StartsWith($releaseRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw '배포 경로가 잘못되었습니다.' }
if (!$NodePath) {
  $command = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($command) { $NodePath = $command.Source }
  else { $NodePath = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
}
if (!(Test-Path $NodePath)) { throw 'Node.js 20 이상 실행 파일을 찾지 못했습니다. -NodePath를 지정하세요.' }
if (Test-Path $folder) { Remove-Item -LiteralPath $resolved -Recurse -Force }
New-Item -ItemType Directory -Path $folder -Force | Out-Null
Copy-Item (Join-Path $root 'src') $folder -Recurse -Force
$vendor = Join-Path $folder 'vendor'
New-Item -ItemType Directory -Path $vendor -Force | Out-Null
Copy-Item (Join-Path $root 'vendor\xlsx.full.min.js'),(Join-Path $root 'vendor\SHEETJS-LICENSE.txt') $vendor -Force
Copy-Item (Join-Path $root 'vendor\Sortable.min.js'),(Join-Path $root 'vendor\SORTABLE-LICENSE.txt') $vendor -Force
Copy-Item (Join-Path $root 'vendor\FILEPOND.min.js'),(Join-Path $root 'vendor\FILEPOND.min.css'),(Join-Path $root 'vendor\FILEPOND-LICENSE.txt') $vendor -Force
if (!(Test-Path (Join-Path $root 'vendor\ocr\python.exe'))) { throw '로컬 OCR 번들을 준비하세요.' }
Copy-Item -LiteralPath (Join-Path $root 'vendor\ocr') -Destination $vendor -Recurse -Force
Copy-Item (Join-Path $root 'vendor\pixelmatch.js'),(Join-Path $root 'vendor\PIXELMATCH-LICENSE.txt'),(Join-Path $root 'vendor\pixelmatch-manifest.json') $vendor -Force
Copy-Item $NodePath (Join-Path $folder 'node.exe')
Copy-Item (Join-Path $root 'README.md'),(Join-Path $root 'version.txt'),(Join-Path $root 'release-channel.json'),(Join-Path $root 'THIRD_PARTY_NOTICES.md'),(Join-Path $root "CHANGES-$version.md"),(Join-Path $root "VALIDATION-$version.md"),(Join-Path $root 'LINUX.md') $folder
if (Test-Path (Join-Path $root 'NODE-LICENSE.txt')) { Copy-Item (Join-Path $root 'NODE-LICENSE.txt') $folder }
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (!(Test-Path $compiler)) { throw 'Windows .NET Framework C# 컴파일러가 필요합니다.' }
Push-Location $root
try {
  & $compiler /nologo /target:winexe /reference:System.Windows.Forms.dll /out:release/LinguaLens/LinguaLens.exe Launcher.cs
  if ($LASTEXITCODE -ne 0) { throw '런처 빌드에 실패했습니다.' }
  & $compiler /nologo /target:winexe /reference:System.Windows.Forms.dll /out:release/LinguaLens/LinguaLensFolderPicker.exe FolderPicker.cs
  if ($LASTEXITCODE -ne 0) { throw '폴더 선택 도구 빌드에 실패했습니다.' }
  & $compiler /nologo /target:winexe /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll /out:release/LinguaLens/LinguaLensUpdater.exe Updater.cs
  if ($LASTEXITCODE -ne 0) { throw '업데이터 빌드에 실패했습니다.' }
  $version = (Get-Content 'version.txt' -Raw).Trim()
  $asset = Join-Path $root 'LinguaLens-Windows.zip'
  $setup = Join-Path $root ('Language-Test-Setup-' + $version + '.zip')
  Compress-Archive -LiteralPath $folder -DestinationPath $asset -Force
  Copy-Item (Join-Path $root 'Install.cmd'),(Join-Path $root 'Install.ps1'),(Join-Path $root 'README.md') (Join-Path $root 'release') -Force
  Compress-Archive -Path (Join-Path $root 'release\*') -DestinationPath $setup -Force
  Write-Output ('Version: ' + $version)
  Write-Output ('Release asset: ' + $asset)
  Write-Output ('SHA-256: ' + (Get-FileHash $asset -Algorithm SHA256).Hash)
  Write-Output ('First-install ZIP: ' + $setup)
} finally { Pop-Location }
