# ============================================================
# KATDOC — VACIAR STORAGE VÍA STORAGE API
# Vacía los objetos de los buckets pet-photos, medical-documents,
# lab-exams y ecografias usando la Storage API de Supabase
# (Supabase bloquea el DELETE directo sobre storage.objects).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/limpiar_storage.ps1
#
# Lee NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
# desde .env.local. Conserva los buckets y sus políticas.
# ⚠️ IRREVERSIBLE: borra todas las fotos, exámenes y ecografías.
# ============================================================

$ErrorActionPreference = 'Stop'

$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path $envFile)) {
    throw "No se encontró .env.local en $envFile"
}

# Leer variables desde .env.local (claves simples sin comillas)
$envMap = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') {
        $envMap[$Matches[1]] = $Matches[2].Trim()
    }
}

$supabaseUrl = $envMap['NEXT_PUBLIC_SUPABASE_URL']
$anonKey     = $envMap['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (-not $supabaseUrl -or -not $anonKey) {
    throw 'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local'
}

$buckets = @('pet-photos', 'medical-documents', 'lab-exams', 'ecografias')

$headers = @{
    'apikey'          = $anonKey
    'Authorization'   = "Bearer $anonKey"
    'Content-Type'    = 'application/json'
}

function Invoke-ListBucket($bucket) {
    $body = @{ prefix = ''; limit = 1000; offset = 0; sortBy = @{ column = 'name'; order = 'asc' } } | ConvertTo-Json -Depth 4
    try {
        $resp = Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/object/list/$bucket" -Headers $headers -Body $body
    } catch {
        Write-Host "  [skip] No se pudo listar $bucket : $($_.Exception.Message)" -ForegroundColor Yellow
        return @()
    }
    return @($resp | Where-Object { -not $_.id })
}

function Invoke-DeleteObjects($bucket, $paths) {
    $chunks = @()
    for ($i = 0; $i -lt $paths.Count; $i += 100) {
        $chunks += ,@($paths[$i..([Math]::Min($i + 99, $paths.Count - 1))])
    }
    foreach ($chunk in $chunks) {
        $body = $chunk | ConvertTo-Json
        try {
            Invoke-RestMethod -Method Post -Uri "$supabaseUrl/storage/v1/object/delete/$bucket" -Headers $headers -Body $body | Out-Null
        } catch {
            Write-Host "  [error] Borrando lote en $bucket : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "Vaciando Storage de KATDOC ($supabaseUrl)" -ForegroundColor Cyan
foreach ($bucket in $buckets) {
    $objects = Invoke-ListBucket $bucket
    $paths = @($objects | ForEach-Object { $_.name })
    if ($paths.Count -eq 0) {
        Write-Host "  $bucket : vacío" -ForegroundColor Green
        continue
    }
    Write-Host "  $bucket : $($paths.Count) objeto(s) encontrados, borrando..." -ForegroundColor Yellow
    Invoke-DeleteObjects $bucket $paths
    Write-Host "  $bucket : limpio" -ForegroundColor Green
}

Write-Host "Storage vaciado. Verifica en Supabase → Storage." -ForegroundColor Cyan
