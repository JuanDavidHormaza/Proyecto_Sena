$loginBody = @{ email = "superadmin@worklex.com"; password = "SuperAdmin123*" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResp.access
$authHeader = "Authorization: Bearer $token"

$dict = curl.exe -s "http://localhost:8000/api/dictionary/" -H $authHeader | ConvertFrom-Json
Write-Output "Total palabras: $($dict.Count)"

$byProgram = $dict | Group-Object -Property program
foreach ($g in $byProgram) {
    Write-Output "Programa: '$($g.Name)' -> $($g.Count) palabras"
}
