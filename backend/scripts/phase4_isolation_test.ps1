$ErrorActionPreference = "Stop"

# Load Env
$envFile = "$(Get-Location)\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        $cleanName = $name.Trim()
        $cleanValue = $value.Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($cleanName, $cleanValue)
    }
}
else {
    Write-Host "No .env file found at $envFile"
    exit 1
}

$SUPABASE_URL = [Environment]::GetEnvironmentVariable("SUPABASE_URL")
$SUPABASE_ANON_KEY = [Environment]::GetEnvironmentVariable("SUPABASE_KEY")

if ([string]::IsNullOrEmpty($SUPABASE_URL) -or [string]::IsNullOrEmpty($SUPABASE_ANON_KEY)) {
    Write-Host "Missing Supabase credentials in .env"
    exit 1
}

$testEmail = "vehicle@manifest.local"
$testPassword = "123"

Write-Host "`n=== Starting Phase 5.7: Tenant Isolation Test ===`n"

# 1. Login to get JWT
Write-Host "1. Logging in as $testEmail..."
$loginPayload = @{ email = $testEmail; password = $testPassword } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" `
        -Method Post `
        -Headers @{ "apikey" = $SUPABASE_ANON_KEY; "Content-Type" = "application/json" } `
        -Body $loginPayload -ErrorAction Stop

    $accessToken = $loginResponse.access_token
    $manifestId = $loginResponse.user.app_metadata.manifest_id

    if (-not $accessToken) {
        Write-Host "❌ Failed to log in: No access token"
        exit 1
    }
}
catch {
    Write-Host "❌ Failed to log in: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
    exit 1
}

Write-Host "✅ Logged in successfully. Current JWT manifest_id: '$manifestId'"

# Core API Headers
$apiHeaders = @{
    "apikey"        = $SUPABASE_ANON_KEY
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

# Test 1: Authorized Read
Write-Host "`n2. Testing Authorized Read (manifest_id = '$manifestId')..."
try {
    $ownReadResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/vehicles?manifest_id=eq.$manifestId&limit=1" `
        -Method Get `
        -Headers $apiHeaders
    Write-Host "✅ Authorized Read Successful. Found: $($ownReadResponse.Count) records."
}
catch {
    Write-Host "❌ Authorized Read Failed: $_"
}

# Test 2: Unauthorized Read (target CTL/EBB01R)
$FOREIGN_MANIFEST_ID = "CTL/EBB01R"
Write-Host "`n3. Testing Unauthorized Read (target manifest_id = '$FOREIGN_MANIFEST_ID')..."
try {
    $foreignReadResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/vehicles?manifest_id=eq.$FOREIGN_MANIFEST_ID" `
        -Method Get `
        -Headers $apiHeaders

    if ($foreignReadResponse.Count -eq 0) {
        Write-Host "✅ Unauthorized Read returned 0 rows (RLS filtered successfully without throwing)."
    }
    else {
        Write-Host "❌ CRITICAL FAILURE: Security Breach! Foreign data returned $($foreignReadResponse.Count) rows."
    }
}
catch {
    Write-Host "✅ Unauthorized Read correctly blocked by DB. Error: $_"
}

# Test 3: Unauthorized Insert
Write-Host "`n4. Testing Unauthorized Insert (Spoofing target manifest_id = '$FOREIGN_MANIFEST_ID')..."
$insertPayload = @{
    manifest_id  = $FOREIGN_MANIFEST_ID
    number_plate = "UAA 999Z"
    type         = "Car"
    capacity     = 4
    id           = [Guid]::NewGuid().ToString()
} | ConvertTo-Json

try {
    $insertResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/vehicles" `
        -Method Post `
        -Headers $apiHeaders `
        -Body $insertPayload

    Write-Host "❌ CRITICAL FAILURE: Security Breach! Insert allowed for a foreign manifest_id."
    Write-Host ($insertResponse | ConvertTo-Json)
}
catch {
    Write-Host "✅ Unauthorized Insert correctly blocked by RLS. Security is active."
    Write-Host "Reason: $_"
}

Write-Host "`n=== Isolation Test Complete ===`n"
