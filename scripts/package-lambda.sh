#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output="${1:-$repo_root/artifacts/lambda-api.zip}"
if [[ "$output" != /* ]]; then
  output="$(pwd)/$output"
fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$(dirname "$output")"

"$repo_root/node_modules/.bin/esbuild" \
  "$repo_root/apps/lambda-api/src/index.ts" \
  --bundle \
  --platform=node \
  --target=node24 \
  --format=esm \
  --outfile="$tmp/index.mjs" \
  --sourcemap \
  --sources-content=false \
  --log-level=warning

# Fixed timestamps and entry order make identical source/dependencies produce
# identical zip bytes on repeated runs.
TZ=UTC touch -t 198001010000 "$tmp/index.mjs" "$tmp/index.mjs.map"
rm -f "$output"
(
  cd "$tmp"
  TZ=UTC zip -X -q "$output" index.mjs index.mjs.map
)

artifact_bytes="$(wc -c <"$output" | tr -d '[:space:]')"
if ((artifact_bytes > 10 * 1024 * 1024)); then
  echo "Artifact exceeds the course 10 MiB compressed-size guard." >&2
  exit 1
fi

code_sha256="$(openssl dgst -sha256 -binary "$output" | openssl base64 -A)"
echo "Packaged Lambda artifact: $output"
echo "Compressed bytes: $artifact_bytes"
echo "AWS CodeSha256: $code_sha256"
