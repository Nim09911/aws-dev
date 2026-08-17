#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?Export AWS_REGION first}"
: "${ECS_CLUSTER:?Export ECS_CLUSTER first}"
: "${ECS_SERVICE:?Export ECS_SERVICE first}"

profile_args=()
if [[ -n "${AWS_PROFILE:-}" ]]; then
  profile_args=(--profile "$AWS_PROFILE")
fi

task_arn="$(aws ecs list-tasks \
  "${profile_args[@]}" --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" --service-name "$ECS_SERVICE" \
  --desired-status RUNNING --query 'taskArns[0]' --output text)"

if [[ "$task_arn" == "None" || -z "$task_arn" ]]; then
  echo "No running task found." >&2
  exit 1
fi

eni_id="$(aws ecs describe-tasks \
  "${profile_args[@]}" --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" --tasks "$task_arn" \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value | [0]' \
  --output text)"

aws ec2 describe-network-interfaces \
  "${profile_args[@]}" --region "$AWS_REGION" \
  --network-interface-ids "$eni_id" \
  --query 'NetworkInterfaces[0].Association.PublicIp' --output text
