$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'LinguaLens'
$target = Join-Path $env:LOCALAPPDATA 'Programs\LinguaLens'
if (!(Test-Path (Join-Path $source 'LinguaLens.exe'))) { throw 'LinguaLens 배포 폴더를 찾지 못했습니다.' }
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item (Join-Path $source '*') $target -Recurse -Force
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
foreach ($folder in @($desktop, $startMenu)) {
  $oldPath = Join-Path $folder 'LinguaLens.lnk'
  if (Test-Path $oldPath) {
    $old = $shell.CreateShortcut($oldPath)
    if ($old.TargetPath -eq (Join-Path $target 'LinguaLens.exe')) { Remove-Item -LiteralPath $oldPath -Force }
  }
  $shortcut = $shell.CreateShortcut((Join-Path $folder 'Language Test.lnk'))
  $shortcut.TargetPath = Join-Path $target 'LinguaLens.exe'
  $shortcut.WorkingDirectory = $target
  $shortcut.Save()
}
Write-Host "Language Test 설치 완료: $target"
