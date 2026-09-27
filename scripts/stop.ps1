$ErrorActionPreference = "Stop"

docker rm -f pm-app 2>$null
if ($LASTEXITCODE -ne 0) {
    $LASTEXITCODE = 0
}
Write-Output "Project Management app stopped"
