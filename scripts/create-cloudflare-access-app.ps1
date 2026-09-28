$ErrorActionPreference = "Stop"

$accountId = "ba557f0a7b034560a89a9aa8a61766b2"
$policyId = "83d0ca9f-ef05-4122-a520-67a2d0d2d71d"
$applicationName = "CourtSide Admin"
$apiBaseUrl = "https://api.cloudflare.com/client/v4"

$secureToken = Read-Host "Paste the temporary Cloudflare API token" -AsSecureString
$tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer).Trim()
  $headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
  }

  try {
    $verifyResponse = Invoke-RestMethod `
      -Uri "$apiBaseUrl/user/tokens/verify" `
      -Method Get `
      -Headers $headers
  }
  catch {
    throw "Cloudflare rejected this token. Paste the generated token secret (not its name or ID). If its secret page was closed or the token expired, create a new temporary token."
  }

  if (-not $verifyResponse.success -or $verifyResponse.result.status -ne "active") {
    throw "The Cloudflare API token is not active. Create a new temporary token and try again."
  }

  $applicationsUrl = "$apiBaseUrl/accounts/$accountId/access/apps"
  $existingResponse = Invoke-RestMethod `
    -Uri "${applicationsUrl}?page=1&per_page=100" `
    -Method Get `
    -Headers $headers

  $existingApplication = $existingResponse.result |
    Where-Object { $_.name -eq $applicationName } |
    Select-Object -First 1

  if ($null -eq $existingApplication) {
    $requestBody = @{
      type = "self_hosted"
      name = $applicationName
      session_duration = "24h"
      app_launcher_visible = $false
      destinations = @(
        @{
          type = "public"
          uri = "pickleball-reservation.a-k-arcel69.workers.dev/admin*"
        },
        @{
          type = "public"
          uri = "pickleball-reservation.a-k-arcel69.workers.dev/api/admin*"
        }
      )
      policies = @(
        @{
          id = $policyId
          account_id = $accountId
          precedence = 1
        }
      )
    } | ConvertTo-Json -Depth 8

    $createResponse = Invoke-RestMethod `
      -Uri $applicationsUrl `
      -Method Post `
      -Headers $headers `
      -Body $requestBody

    $existingApplication = $createResponse.result
    Write-Host "Created Cloudflare Access application '$applicationName'." -ForegroundColor Green
  }
  else {
    Write-Host "Cloudflare Access application '$applicationName' already exists; no duplicate was created." -ForegroundColor Yellow
  }

  Write-Host "Application ID: $($existingApplication.id)"
  Write-Host "Audience (AUD) tag: $($existingApplication.aud)"
  Write-Host "Copy the AUD tag. You will add it to the Worker's CLOUDFLARE_ACCESS_AUD secret."
}
finally {
  if ($tokenPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
  }
  $token = $null
  $headers = $null
  $secureToken = $null
}
