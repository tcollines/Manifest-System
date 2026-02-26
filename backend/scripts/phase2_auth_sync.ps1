$envPath = Join-Path -Path $PSScriptRoot -ChildPath "..\.env"
$envVariables = Get-Content $envPath | Where-Object { $_ -match "^([^=]+)=(.*)$" } | ForEach-Object {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    Set-Variable -Name $name -Value $value -Scope Script
}

$fetchUrl = "$SUPABASE_URL/rest/v1/users?select=*"
$adminAuthUrl = "$SUPABASE_URL/auth/v1/admin/users"

Write-Host "Starting Phase 2: Supabase Auth Sync Script (Version 6 - Ultimate Disambiguation)..."

$response = Invoke-RestMethod -Uri $fetchUrl -Method Get -Headers @{
    "apikey"        = $SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
}

$successCount = 0
$failCount = 0
$skipCount = 0

foreach ($user in $response) {
    if (-not $user.password -or $user.password.Trim() -eq "") {
        Write-Host "⏭️ Skipped (No Password in DB): $($user.username)" -ForegroundColor Yellow
        $skipCount++
        continue
    }

    $username = $user.username.Replace(" ", "").Replace("@", "_").ToLower()
    $email = "$username@manifest.local"

    $body = @{
        "id"            = $user.id
        "email"         = $email
        "password"      = $user.password
        "email_confirm" = $true
        "app_metadata"  = @{
            "manifest_id" = $user.manifest_id
            "role"        = $user.role
        }
    } | ConvertTo-Json -Depth 5 -Compress

    try {
        $createResponse = Invoke-RestMethod -Uri $adminAuthUrl -Method Post -Headers @{
            "apikey"        = $SUPABASE_SERVICE_ROLE_KEY
            "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type"  = "application/json"
        } -Body $body

        Write-Host "✅ Synced user: $email" -ForegroundColor Green
        $successCount++
    }
    catch {
        $errResp = $_.Exception.Response
        if ($errResp) {
            $stream = $errResp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errBody = $reader.ReadToEnd()
            $reader.Close()
            
            if ($errBody -match "User already registered" -or $errBody -match "already exists" -or $errBody -match "email_exists") {
                # Collision detected! Version 6: Guarantee uniqueness by appending the FULL UUID stripped of hyphens.
                $fullIdNoHyphens = $user.id.Replace("-", "")
                $uniqueEmail = "${username}_${fullIdNoHyphens}@manifest.local"
                
                $retryBody = @{
                    "id"            = $user.id
                    "email"         = $uniqueEmail
                    "password"      = $user.password
                    "email_confirm" = $true
                    "app_metadata"  = @{
                        "manifest_id" = $user.manifest_id
                        "role"        = $user.role
                    }
                } | ConvertTo-Json -Depth 5 -Compress

                try {
                    $retryResponse = Invoke-RestMethod -Uri $adminAuthUrl -Method Post -Headers @{
                        "apikey"        = $SUPABASE_SERVICE_ROLE_KEY
                        "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
                        "Content-Type"  = "application/json"
                    } -Body $retryBody
            
                    Write-Host "🔄 Disambiguated & Synced user: $uniqueEmail" -ForegroundColor Yellow
                    $successCount++
                }
                catch {
                    $errResp2 = $_.Exception.Response
                    if ($errResp2) {
                        $s2 = $errResp2.GetResponseStream()
                        $r2 = New-Object System.IO.StreamReader($s2)
                        $eb2 = $r2.ReadToEnd()
                        $r2.Close()
                        if ($eb2 -match "already exists" -or $eb2 -match "duplicate key") {
                            Write-Host "⏭️ Skipped (ID Already migrated): $uniqueEmail" -ForegroundColor Cyan
                            $skipCount++
                        }
                        else {
                            Write-Host "❌ Failed final fallback sync $uniqueEmail : $eb2" -ForegroundColor Red
                            $failCount++
                        }
                    }
                    else {
                        Write-Host "❌ Failed final fallback sync $uniqueEmail : $($_.Exception.Message)" -ForegroundColor Red
                        $failCount++
                    }
                }
            }
            else {
                Write-Host "❌ Failed to sync $email : $errBody" -ForegroundColor Red
                $failCount++
            }
        }
        else {
            Write-Host "❌ Failed to sync $email : $($_.Exception.Message)" -ForegroundColor Red
            $failCount++
        }
    }
}

Write-Host "`n--- Migration Summary ---"
Write-Host "Successfully Migrated: $successCount"
Write-Host "Skipped:               $skipCount"
Write-Host "Failed:                $failCount"

if ($failCount -gt 0) {
    exit 1
}
else {
    exit 0
}
