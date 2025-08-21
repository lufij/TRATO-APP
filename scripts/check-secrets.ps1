<#
Scan the repository for obvious secret-like patterns and exit non-zero if found.
This is a lightweight pre-commit check. It is NOT a replacement for a full secret
scanner in CI (we add a GitHub Action for that).
#>

$ErrorActionPreference = 'Stop'

$patterns = @(
  'eyJ[A-Za-z0-9_\-\.]{20,}', # probable JWT-like
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'VERCEL_DIAG_SECRET',
  '-----BEGIN PRIVATE KEY-----'
)

$excludeDirs = @('.git', 'node_modules', '.vercel')

Write-Host "Scanning for potential secrets..."

$files = Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
  ($_.Attributes -band [System.IO.FileAttributes]::Hidden) -eq 0 -and
  (-not ($excludeDirs | ForEach-Object { $_ -and ($_.FullName -match [regex]::Escape($_)) }))
}

$hits = @()
foreach ($f in $files) {
  if ($f.Extension -in '.png','.jpg','.jpeg','.gif','.svg','.ico') { continue }
  try {
    $content = Get-Content -Raw -ErrorAction SilentlyContinue $f.FullName
  } catch { continue }
  foreach ($p in $patterns) {
    if ($null -ne ($content -match $p)) {
      $matchLine = (Select-String -Path $f.FullName -Pattern $p -SimpleMatch -AllMatches | Select-Object -First 1).LineNumber
      $hits += [PSCustomObject]@{ File = $f.FullName; Pattern = $p; Line = $matchLine }
    }
  }
}

if ($hits.Count -gt 0) {
  Write-Host "Potential secrets found:" -ForegroundColor Yellow
  $hits | ForEach-Object { Write-Host "  $($_.File):$($_.Line) => $($_.Pattern)" }
  Write-Host "Commit blocked. Review and remove secrets or mark file as safe." -ForegroundColor Red
  exit 1
}

Write-Host "No obvious secrets found." -ForegroundColor Green
exit 0
