#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"

base="${1:-/aws-developer-course/ecs/dev}"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
chmod 600 "$tmp"

aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION" >/dev/null

put_parameter() {
  local name="$1" type="$2" prompt="$3" value version
  read -r -s -p "$prompt: " value
  printf '\n'
  if [[ -z "$value" ]]; then
    echo "Refusing an empty value for $name" >&2
    exit 1
  fi
  python3 -c '
import json, sys
print(json.dumps({
    "Name": sys.argv[1],
    "Type": sys.argv[2],
    "Tier": "Standard",
    "Value": sys.stdin.read().rstrip("\n"),
    "Overwrite": True,
}))
' "$name" "$type" <<<"$value" >"$tmp"
  unset value
  version="$(aws ssm put-parameter \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --cli-input-json "file://$tmp" \
    --query Version \
    --output text)"
  : >"$tmp"
  echo "Seeded $name at version $version (value not displayed)"
}

put_parameter "$base/jwt-public-key-base64" "SecureString" "Base64-encoded RSA public key"
put_parameter "$base/jwt-issuer" "String" "JWT issuer"
put_parameter "$base/jwt-audience" "String" "JWT audience"
