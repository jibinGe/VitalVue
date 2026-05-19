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

# 2. Connect via SSH and restart Docker Compose (Updated Syntax)
echo "🐳 Rebuilding and restarting Docker containers on the server..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new "$SERVER_USER@$SERVER_IP" << EOF
  cd $REMOTE_PROJECT_ROOT
  
  echo "🔹 Pulling down existing containers..."
  docker-compose down
  
  echo "🔹 Building and starting updated containers..."
  docker-compose up --build -d
  
  echo "🔹 Cleaning up dangling Docker elements to save space..."
  docker image prune -f
EOF

echo "✅ Deployment completed successfully!"