#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: scripts/with-node.sh <command> [args...]" >&2
  exit 64
fi

export PATH="${PATH:-/usr/bin:/bin}"

prepend_path_if_dir() {
  local dir="$1"

  if [ ! -d "$dir" ]; then
    return
  fi

  case ":$PATH:" in
    *":$dir:"*) ;;
    *) PATH="$dir:$PATH" ;;
  esac
}

prepend_path_if_dir "$HOME/.local/bin"
prepend_path_if_dir "/opt/homebrew/bin"
prepend_path_if_dir "/opt/homebrew/sbin"
prepend_path_if_dir "/usr/local/bin"
prepend_path_if_dir "/usr/local/sbin"
export PATH

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
