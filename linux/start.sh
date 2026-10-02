#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
exec node "$APP_ROOT/linux/launch.mjs" "$@"
