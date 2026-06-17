#!/usr/bin/env bash
# Run PocketBase locally on :8090 with automigrate enabled.
# Downloads the pinned PocketBase binary into server/ on first run.
set -euo pipefail

PB_VERSION="0.39.4"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../server"
BIN="$SERVER_DIR/pocketbase"

# Detect platform for the download URL.
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$OS" in
  darwin) PB_OS="darwin" ;;
  linux)  PB_OS="linux" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac
case "$ARCH" in
  arm64|aarch64) PB_ARCH="arm64" ;;
  x86_64|amd64)  PB_ARCH="amd64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

if [ ! -x "$BIN" ]; then
  echo "Downloading PocketBase v${PB_VERSION} (${PB_OS}_${PB_ARCH})..."
  ZIP="$SERVER_DIR/pb.zip"
  URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_OS}_${PB_ARCH}.zip"
  curl -fsSL "$URL" -o "$ZIP"
  unzip -o "$ZIP" pocketbase -d "$SERVER_DIR" >/dev/null
  rm -f "$ZIP"
  chmod +x "$BIN"
fi

cd "$SERVER_DIR"
echo "Starting PocketBase on http://127.0.0.1:8090 (admin UI at /_/)"
exec "$BIN" serve --http=0.0.0.0:8090 --dir=./pb_data --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
