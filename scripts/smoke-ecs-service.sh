#!/usr/bin/env bash
set -euo pipefail

host="${1:?Usage: smoke-ecs-service.sh PUBLIC_IP ALLOWED_ORIGIN}"
allowed_origin="${2:?Usage: smoke-ecs-service.sh PUBLIC_IP ALLOWED_ORIGIN}"
disallowed_origin="https://disallowed.invalid"
url="http://${host}:3000"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 10 \
  "$url/health/live" >"$tmp/live.json"
node -e '
    let body = "";
    process.stdin.on("data", chunk => body += chunk);
    process.stdin.on("end", () => {
      const parsed = JSON.parse(body);
      if (parsed.status !== "ok") process.exit(1);
      console.log("Liveness smoke check passed.");
    });
  ' <"$tmp/live.json"

curl --fail --silent --show-error \
  --connect-timeout 5 --max-time 10 \
  "$url/health/ready" >"$tmp/ready.json"
node -e '
    let body = "";
    process.stdin.on("data", chunk => body += chunk);
    process.stdin.on("end", () => {
      const parsed = JSON.parse(body);
      if (parsed.status !== "ok") process.exit(1);
      console.log("Readiness smoke check passed.");
    });
  ' <"$tmp/ready.json"

status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --connect-timeout 5 --max-time 10 "$url/hello")"
[[ "$status" == "401" ]] || {
  echo "Expected unauthenticated /hello to return 401, got $status" >&2
  exit 1
}
echo "Authentication boundary smoke check passed."

curl --silent --show-error --output /dev/null \
  --dump-header "$tmp/allowed.headers" \
  --connect-timeout 5 --max-time 10 \
  -H "Origin: $allowed_origin" "$url/health/live"
if ! python3 -c '
import sys
expected = sys.argv[1]
headers = {}
for line in sys.stdin:
    if ":" in line:
        key, value = line.split(":", 1)
        headers[key.lower()] = value.strip()
raise SystemExit(headers.get("access-control-allow-origin") != expected)
' "$allowed_origin" <"$tmp/allowed.headers"; then
  echo "Allowed origin did not receive its exact CORS header." >&2
  exit 1
fi
echo "Allowed-origin CORS smoke check passed."

curl --silent --show-error --output /dev/null \
  --dump-header "$tmp/disallowed.headers" \
  --connect-timeout 5 --max-time 10 \
  -H "Origin: $disallowed_origin" "$url/health/live"
if python3 -c '
import sys
raise SystemExit(not any(
    line.lower().startswith("access-control-allow-origin:")
    for line in sys.stdin
))
' <"$tmp/disallowed.headers"; then
  echo "Disallowed origin received a CORS allow header." >&2
  exit 1
fi
echo "Disallowed-origin CORS smoke check passed."
