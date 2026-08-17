#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"

stage="${1:?Usage: delete-lambda-parameters.sh dev|stage [BASE_PATH]}"
[[ "$stage" == "dev" || "$stage" == "stage" ]] || {
  echo "Stage must be dev or stage." >&2
  exit 1
}
base="${2:-${LAMBDA_PARAMETER_BASE_PATH:-/aws-developer-course/lambda}}"
path="$base/$stage"
names=(
  "$path/jwt-public-key-base64"
  "$path/jwt-issuer"
  "$path/jwt-audience"
)

aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"
printf 'Delete these three parameter names (values will not be read)? %s [yes/NO]: ' "$path/*"
read -r confirmation
[[ "$confirmation" == "yes" ]] || {
  echo "Cancelled."
  exit 1
}

aws ssm delete-parameters \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --names "${names[@]}" >/dev/null
echo "Requested deletion of the three $stage runtime parameters."
