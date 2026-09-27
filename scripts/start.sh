#!/usr/bin/env sh
set -eu

docker build -t pm-app .
if [ -f .env ]; then
  docker run --rm -d --name pm-app -p 8000:8000 --env-file .env pm-app
else
  docker run --rm -d --name pm-app -p 8000:8000 pm-app
fi
echo "Project Management app started at http://localhost:8000"
