#!/usr/bin/env bash
set -euo pipefail

base_url="${1:?Usage: smoke-lambda-api.sh API_STAGE_URL [--authenticated]}"
mode="${2:-}"
base_url="${base_url%/}"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

request_status() {
  local path="$1"
  shift
  curl --silent --show-error --output "$tmp" --write-out '%{http_code}' \
    "$@" "$base_url$path"
}

live_status="$(request_status /health/live)"
[[ "$live_status" == "200" ]] || {
  echo "Liveness failed with HTTP $live_status" >&2
  exit 1
}

ready_status="$(request_status /health/ready)"
[[ "$ready_status" == "200" ]] || {
  echo "Readiness failed with HTTP $ready_status" >&2
  exit 1
}

unauthorized_status="$(request_status /api/hello)"
[[ "$unauthorized_status" == "401" ]] || {
  echo "Unauthenticated hello expected 401, got $unauthorized_status" >&2
  exit 1
}

echo "Smoke passed: live=200 ready=200 unauthenticated-hello=401"

if [[ "$mode" == "--authenticated" ]]; then
  read -r -s -p "Bearer token (not displayed): " token
  printf '\n'
  [[ -n "$token" ]] || {
    echo "Refusing an empty token." >&2
    exit 1
  }
  authenticated_status="$(
    request_status /api/hello -H "Authorization: Bearer $token"
  )"
  unset token
  [[ "$authenticated_status" == "200" ]] || {
    echo "Authenticated hello expected 200, got $authenticated_status" >&2
    exit 1
  }
  echo "Authenticated hello passed (response body not displayed)."
elif [[ -n "$mode" ]]; then
  echo "Unknown option: $mode" >&2
  exit 1
fi
