#!/usr/bin/env sh
set -eu

docker rm -f pm-app 2>/dev/null || true
echo "Project Management app stopped"
