#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: scripts/with-node.sh <command> [args...]" >&2
  exit 64
fi

if [ -x /opt/homebrew/bin/node ]; then
  export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    nvm use --silent default >/dev/null 2>&1 || true
  fi
fi

if ! command -v "$1" >/dev/null 2>&1; then
  echo "Unable to find required command \"$1\" after Node bootstrap." >&2
  exit 127
fi

exec "$@"
