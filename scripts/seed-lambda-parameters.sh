#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"

stage="${1:?Usage: seed-lambda-parameters.sh dev|stage [BASE_PATH]}"
[[ "$stage" == "dev" || "$stage" == "stage" ]] || {
  echo "Stage must be dev or stage." >&2
  exit 1
}
base="${2:-${LAMBDA_PARAMETER_BASE_PATH:-/aws-developer-course/lambda}}"
path="$base/$stage"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
chmod 600 "$tmp"

aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" >/dev/null

put_parameter() {
  local name="$1" type="$2" prompt="$3" value version
  read -r -s -p "$prompt: " value
  printf '\n'
  [[ -n "$value" ]] || {
    echo "Refusing an empty value for $name" >&2
    exit 1
  }
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
  version="$(
    aws ssm put-parameter \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --cli-input-json "file://$tmp" \
      --query Version \
      --output text
  )"
  : >"$tmp"
  echo "Seeded $name at version $version (value not displayed)"
}

put_parameter "$path/jwt-public-key-base64" "SecureString" "Base64-encoded RSA public key"
put_parameter "$path/jwt-issuer" "String" "JWT issuer"
put_parameter "$path/jwt-audience" "String" "JWT audience"
