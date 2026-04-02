#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -d node_modules ] && [ -f node_modules/gray-matter/package.json ]; then
  exec "$ROOT_DIR/scripts/with-node.sh" npm run content:build
fi

exec ruby "$ROOT_DIR/scripts/generate-content-index-fallback.rb"
