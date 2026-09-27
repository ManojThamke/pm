$ErrorActionPreference = "Stop"

docker build -t pm-app .
if (Test-Path .env) {
    docker run --rm -d --name pm-app -p 8000:8000 --env-file .env pm-app
} else {
    docker run --rm -d --name pm-app -p 8000:8000 pm-app
}
Write-Output "Project Management app started at http://localhost:8000"
