#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"
prefix="${1:?Usage: audit-fargate-destroy.sh NAME_PREFIX}"
family="${prefix}-ecs-api"

aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION"

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

check_empty "ECS clusters" "$(aws ecs list-clusters --profile "$AWS_PROFILE" --region "$AWS_REGION" --query "length(clusterArns[?contains(@, \`$prefix\`)])" --output text)"
check_empty "ECR repositories" "$(aws ecr describe-repositories --profile "$AWS_PROFILE" --region "$AWS_REGION" --query "length(repositories[?contains(repositoryName, \`$prefix\`)])" --output text)"
check_empty "CloudWatch log groups" "$(aws logs describe-log-groups --profile "$AWS_PROFILE" --region "$AWS_REGION" --log-group-name-prefix "/aws/ecs/$prefix" --query 'length(logGroups)' --output text)"
check_empty "VPCs tagged by name" "$(aws ec2 describe-vpcs --profile "$AWS_PROFILE" --region "$AWS_REGION" --filters "Name=tag:Name,Values=$prefix*" --query 'length(Vpcs)' --output text)"
check_empty "IAM roles" "$(aws iam list-roles --profile "$AWS_PROFILE" --query "length(Roles[?starts_with(RoleName, \`$prefix\`)])" --output text)"

task_definition_count=0
for status in ACTIVE INACTIVE; do
  while IFS= read -r arn; do
    [[ -n "$arn" && "$arn" != "None" ]] || continue
    found_family="${arn##*/}"
    found_family="${found_family%:*}"
    if [[ "$found_family" == "$family" ]]; then
      task_definition_count=$((task_definition_count + 1))
    fi
  done < <(
    aws ecs list-task-definitions \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --family-prefix "$family" \
      --status "$status" \
      --query 'taskDefinitionArns[]' \
      --output text | tr '\t' '\n'
  )
done
check_empty "ECS task-definition family $family" "$task_definition_count"

if (( fail )); then
  echo "Audit found course leftovers. Inspect before deleting anything." >&2
  exit 1
fi
echo "No matching Fargate resources or family revisions found. Separately verify parameters, ENIs, public IPv4, billing, and any accidental Regions."
