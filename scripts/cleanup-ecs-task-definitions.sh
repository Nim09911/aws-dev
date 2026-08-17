#!/usr/bin/env bash
set -euo pipefail

: "${AWS_PROFILE:?Export AWS_PROFILE first}"
: "${AWS_REGION:?Export AWS_REGION first}"
family="${1:?Usage: cleanup-ecs-task-definitions.sh EXACT_FAMILY}"

if [[ ! "$family" =~ ^[A-Za-z0-9_-]{1,255}$ ]]; then
  echo "Family must be an exact ECS family name, not an ARN or wildcard." >&2
  exit 1
fi

aws sts get-caller-identity --profile "$AWS_PROFILE" --region "$AWS_REGION"
read -r -p "Type the exact family '$family' to deregister and delete every revision: " confirmation
[[ "$confirmation" == "$family" ]] || { echo "Canceled."; exit 1; }

list_exact() {
  local status="$1" arn listed_family
  while IFS= read -r arn; do
    [[ -n "$arn" && "$arn" != "None" ]] || continue
    listed_family="${arn##*/}"
    listed_family="${listed_family%:*}"
    [[ "$listed_family" == "$family" ]] && printf '%s\n' "$arn"
  done < <(
    aws ecs list-task-definitions \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --family-prefix "$family" \
      --status "$status" \
      --query 'taskDefinitionArns[]' \
      --output text | tr '\t' '\n'
  )
}

active=()
while IFS= read -r arn; do
  active+=("$arn")
done < <(list_exact ACTIVE)
for arn in "${active[@]}"; do
  aws ecs deregister-task-definition \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --task-definition "$arn" >/dev/null
  echo "Deregistered ${arn##*/}"
done

inactive=()
while IFS= read -r arn; do
  inactive+=("$arn")
done < <(list_exact INACTIVE)
for ((offset = 0; offset < ${#inactive[@]}; offset += 10)); do
  batch=("${inactive[@]:offset:10}")
  aws ecs delete-task-definitions \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --task-definitions "${batch[@]}" >/dev/null
  echo "Requested deletion for ${#batch[@]} revision(s)."
done

remaining_active="$(list_exact ACTIVE | wc -l | tr -d ' ')"
remaining_inactive="$(list_exact INACTIVE | wc -l | tr -d ' ')"
if [[ "$remaining_active" != "0" || "$remaining_inactive" != "0" ]]; then
  echo "Family still has ACTIVE=$remaining_active INACTIVE=$remaining_inactive revisions." >&2
  exit 1
fi

echo "No active or inactive revisions remain for exact family '$family'."
echo "AWS may briefly display deleted revisions as DELETE_IN_PROGRESS."
