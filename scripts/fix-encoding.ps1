# One-shot repair: a bulk rewrite read UTF-8 source as Latin-1 and wrote it
# back as UTF-8, double-encoding every non-ASCII character. This reverses it.
$ErrorActionPreference = 'Stop'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$latin1 = [System.Text.Encoding]::GetEncoding(28591)
$aHat = [string][char]0xE2   # 'â' — the leading byte of a mangled 3-byte char
$aTilde = [string][char]0xC3 # 'Ã' — the leading byte of a mangled 2-byte char

$root = Split-Path -Parent $PSScriptRoot
$files = Get-ChildItem -Recurse -Include *.ts -Path (Join-Path $root 'src'), (Join-Path $root 'scripts')

foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  if ($text.Contains($aHat) -or $text.Contains($aTilde)) {
    $fixed = [System.Text.Encoding]::UTF8.GetString($latin1.GetBytes($text))
    [System.IO.File]::WriteAllText($f.FullName, $fixed, $utf8NoBom)
    Write-Output "repaired $($f.Name)"
  } else {
    Write-Output "clean    $($f.Name)"
  }
}
