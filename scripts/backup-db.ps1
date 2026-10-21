# Full Supabase backup (schema + data) into backups\. Run: powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
# Asks for the database password (Supabase dashboard > Project Settings > Database); it is never saved.
$pgDump = 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe'
$ref = 'nnybcikbhzmvufeqscoy'
$sec = Read-Host 'Supabase database password' -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
$env:PGSSLMODE = 'require'
New-Item -ItemType Directory -Force "$PSScriptRoot\..\backups" | Out-Null
$out = "$PSScriptRoot\..\backups\eyecon-$(Get-Date -Format 'yyyy-MM-dd-HHmm').sql"
$ok = $false
# Session pooler (works on IPv4).
foreach ($h in "aws-0-ap-south-1.pooler.supabase.com") {
  & $pgDump -h $h -p 5432 -U "postgres.$ref" -d postgres --schema=public --no-owner --no-privileges -f $out
  if ($LASTEXITCODE -eq 0) { $ok = $true; break }
}
$env:PGPASSWORD = $null
if ($ok) { Write-Host "Saved $out ($([math]::Round((Get-Item $out).Length / 1MB, 1)) MB)" -ForegroundColor Green }
else { Write-Host 'Backup failed. Check the password, or copy the Session pooler host from the dashboard Connect button.' -ForegroundColor Red }
