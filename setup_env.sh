#!/usr/bin/env bash
set -euo pipefail

echo "Starting ABUS with Docker..."

# Check Docker availability
if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker not found. Please install Docker Desktop or Docker Engine first."
  exit 1
fi

if ! command -v docker compose >/dev/null 2>&1; then
  echo "[ERROR] Docker Compose plugin missing. Update Docker Desktop."
  exit 1
fi

# Create .env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[INFO] Created .env from template."
fi

# Build and start
docker compose up -d
echo "[INFO] App is running in Docker containers."
echo "---------------------------------------------"
echo "Frontend: http://localhost"
echo "API:      http://localhost/api/models"
echo "Database: persisted in Docker volume"
echo "---------------------------------------------"
