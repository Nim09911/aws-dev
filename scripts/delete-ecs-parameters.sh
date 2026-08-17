#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"

base="${1:-/aws-developer-course/ecs/dev}"
names=(
  "$base/jwt-public-key-base64"
  "$base/jwt-issuer"
  "$base/jwt-audience"
)

aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION"
printf 'Delete these externally seeded parameters?\n'
printf '  %s\n' "${names[@]}"
read -r -p "Type DELETE to continue: " confirmation
[[ "$confirmation" == "DELETE" ]] || { echo "Canceled."; exit 1; }

aws ssm delete-parameters \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --names "${names[@]}" >/dev/null
echo "Deletion requested; values were not read or displayed."
