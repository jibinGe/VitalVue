#!/bin/bash

set -e

# --- DETECT PATH AUTOMATICALLY ---
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [[ "$BASE_DIR" == */backend ]]; then
    PROJECT_ROOT="$(dirname "$BASE_DIR")"
else
    PROJECT_ROOT="$BASE_DIR"
fi

SERVER_IP="18.142.3.23"
SERVER_USER="ubuntu"

KEY_PATH="$PROJECT_ROOT/files/key.pem"
LOCAL_BACKEND_DIR="$PROJECT_ROOT/backend/"

REMOTE_TARGET_DIR="~/vitalvue/backend/"
REMOTE_PROJECT_ROOT="~/vitalvue"

echo "🚀 Starting deployment to VitalVue server ($SERVER_IP)..."
echo "📂 local project root: $PROJECT_ROOT"

# 1. Sync backend files using rsync
echo "📦 Syncing backend files..."
rsync -avz --delete -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=accept-new" \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '.git' \
  --exclude '.env' \
  "$LOCAL_BACKEND_DIR" "$SERVER_USER@$SERVER_IP:$REMOTE_TARGET_DIR"

# 1b. Sync docker-compose.yml and the EMQX broker config (Veepoo 4G watches).
#     Certificates in emqx/certs/ live only on the server (copied from certbot) — never
#     overwritten or deleted by a deploy.
echo "📦 Syncing docker-compose.yml and emqx/ config..."
rsync -avz -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=accept-new" \
  "$PROJECT_ROOT/docker-compose.yml" "$SERVER_USER@$SERVER_IP:$REMOTE_PROJECT_ROOT/"
rsync -avz --delete -e "ssh -i $KEY_PATH -o StrictHostKeyChecking=accept-new" \
  --exclude 'certs/*.pem' \
  "$PROJECT_ROOT/emqx/" "$SERVER_USER@$SERVER_IP:$REMOTE_PROJECT_ROOT/emqx/"

# 2. Connect via SSH and restart Docker Compose (Updated Syntax)
echo "🐳 Rebuilding and restarting Docker containers on the server..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" << EOF
  set -e
  cd $REMOTE_PROJECT_ROOT

  # Order matters: build and migrate while the OLD containers keep serving, then swap.
  # New code on the old schema breaks BLE ingest (vitals.source missing → 500), so the
  # schema must be ready before the new backend starts. Migrations are additive, so the
  # old code keeps working on the new schema. A failed migration stops here, old stack intact.
  echo "🔹 Building updated images (old containers still running)..."
  docker-compose build

  echo "🔹 Applying database migrations (additive; retries once if the vitals lock times out)..."
  docker-compose up -d db redis
  docker-compose run --rm --no-deps backend alembic upgrade head || { sleep 10; docker-compose run --rm --no-deps backend alembic upgrade head; }
  docker-compose run --rm --no-deps backend alembic current

  echo "🔹 Starting updated containers..."
  docker-compose up -d --remove-orphans

  # The Docker nginx is opt-in (profile "docker-nginx"): the host nginx serves
  # vitalvue-api.genesysailabs.com here, so an old container would only crash-loop.
  docker rm -f vitalvue_nginx 2>/dev/null || true

  echo "🔹 Cleaning up dangling Docker elements to save space..."
  docker image prune -f
EOF

echo "✅ Deployment completed successfully!"