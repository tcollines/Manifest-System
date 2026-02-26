$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\.env"
$envVariables = Get-Content $envPath | Where-Object { $_ -match "^([^=]+)=(.*)$" } | ForEach-Object {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Variable -Name $name -Value $value -Scope Script
}

$url = "$SUPABASE_URL/rest/v1/users?select=*"

try {
    Write-Host "Starting Phase 1 Audit (PowerShell, trimmed): public.users..."
    # Attempting to use SUPABASE_KEY which is a JWT, instead of SUPABASE_SERVICE_ROLE_KEY which might be a Management Token
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers @{
        "apikey"        = $SUPABASE_KEY
        "Authorization" = "Bearer $SUPABASE_KEY"
    }

    $totalUsers = $response.Count
    $missingManifestId = 0
    $invalidUuids = 0
    $missingPassword = 0

    $uuidRegex = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"

    foreach ($user in $response) {
        if (-not ($user.id -match $uuidRegex)) {
            Write-Host "Invalid UUID found for user: $($user.username) (ID: $($user.id))" -ForegroundColor Red
            $invalidUuids++
        }

        if (-not $user.manifest_id) {
            Write-Host "Missing manifest_id for user: $($user.username) (ID: $($user.id))" -ForegroundColor Red
            $missingManifestId++
        }

        if (-not $user.password -or $user.password.Trim() -eq "") {
            Write-Host "Missing password for user: $($user.username) (ID: $($user.id))" -ForegroundColor Yellow
            $missingPassword++
        }
    }

    Write-Host "`n--- Audit Results ---"
    Write-Host "Total users: $totalUsers"
    Write-Host "Users missing manifest_id: $missingManifestId"
    Write-Host "Users with invalid UUID IDs: $invalidUuids"
    Write-Host "Users with missing password: $missingPassword"

    if ($missingManifestId -gt 0 -or $invalidUuids -gt 0) {
        Write-Host "`n❌ AUDIT FAILED: Violations found. Aborting migration setup." -ForegroundColor Red
        exit 1
    }

    Write-Host "`n✅ AUDIT PASSED: Ready for Supabase Auth sync." -ForegroundColor Green
    exit 0

}
catch {
    Write-Error "Error running audit: $_"
    exit 1
}
