#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"
prefix="${1:?Usage: audit-lambda-destroy.sh NAME_PREFIX [PARAMETER_BASE_PATH]}"
parameter_base="${2:-/aws-developer-course/lambda}"

aws sts get-caller-identity \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION"

fail=0
check_empty() {
  local label="$1" value="$2"
  if [[ "$value" != "0" ]]; then
    echo "LEFTOVER: $label ($value)" >&2
    fail=1
  else
    echo "Clear: $label"
  fi
}

check_empty "Lambda functions" "$(
  aws lambda list-functions \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query "length(Functions[?starts_with(FunctionName, \`$prefix\`)])" \
    --output text
)"
check_empty "HTTP APIs" "$(
  aws apigatewayv2 get-apis \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query "length(Items[?starts_with(Name, \`$prefix\`)])" \
    --output text
)"
check_empty "Lambda log groups" "$(
  aws logs describe-log-groups \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --log-group-name-prefix "/aws/lambda/$prefix" \
    --query 'length(logGroups)' \
    --output text
)"
check_empty "API access log groups" "$(
  aws logs describe-log-groups \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --log-group-name-prefix "/aws/apigateway/$prefix" \
    --query 'length(logGroups)' \
    --output text
)"
check_empty "source queues" "$(
  aws sqs list-queues \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --queue-name-prefix "$prefix" \
    --query 'length(QueueUrls || `[]`)' \
    --output text
)"
check_empty "IAM roles" "$(
  aws iam list-roles \
    --profile "$AWS_PROFILE" \
    --query "length(Roles[?starts_with(RoleName, \`$prefix\`)])" \
    --output text
)"
check_empty "runtime parameter metadata" "$(
  aws ssm describe-parameters \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --parameter-filters "Key=Name,Option=BeginsWith,Values=$parameter_base/" \
    --query 'length(Parameters)' \
    --output text
)"

if ((fail)); then
  echo "Audit found course leftovers. Inspect ownership before deleting anything." >&2
  exit 1
fi
echo "No matching Lambda-track resources found. Separately verify billing, accidental Regions, local artifacts/state, and GitHub variables."
