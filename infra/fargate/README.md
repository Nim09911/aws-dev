# Cost-safe ECS Fargate lab

This Terraform root creates the Lesson 10 public-task architecture. It intentionally creates no NAT gateway, load balancer, Route 53 record, VPC endpoint, custom metric, Container Insights setting, access key, or Terraform-managed parameter value.

## Cost and security boundary

- `desired_count = 1` starts one 0.25-vCPU/0.5-GB Fargate task and assigns its ENI a chargeable public IPv4 address. Both stop when the service reaches zero tasks or is destroyed.
- ECR image storage, vulnerability scanning, CloudWatch Logs ingestion/storage, and data transfer can still incur charges after compute stops. Standard Parameter Store parameters currently have no parameter storage charge; advanced parameters and higher-throughput/API options can be priced, so verify the current SSM pricing page.
- The service is plain HTTP on port 3000 and is suitable only for a short learning lab. `ingress_cidr` rejects `0.0.0.0/0`; use your current public IPv4 `/32`.
- Parameter values are seeded outside Terraform. The task definition contains only parameter ARNs, so ordinary Terraform configuration/state does not contain the values.
- Local state can contain account and resource identifiers. It is ignored by Git and must not be shared.

## Bootstrap, apply, and smoke

Prerequisites: AWS CLI temporary credentials, Terraform, Docker, an existing account-level GitHub OIDC provider, and completed Lessons 01–09.

```bash
export AWS_PROFILE="aws-dev-learning"
export AWS_REGION="us-east-1"
aws sts get-caller-identity --profile "$AWS_PROFILE"

cd infra/fargate
cp terraform.tfvars.example terraform.tfvars
# Edit every placeholder, including the exact HTTPS CORS origin.
# Keep desired_count=0 initially: the placeholder SHA is never run.
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Build and push the commit-SHA image before requesting a task:

```bash
cd ../..
export ECR_REPOSITORY_URL="$(terraform -chdir=infra/fargate output -raw ecr_repository_url)"
export IMAGE_TAG="$(git rev-parse HEAD)"
aws ecr get-login-password --profile "$AWS_PROFILE" --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "${ECR_REPOSITORY_URL%%/*}"
export ECR_REPOSITORY="${ECR_REPOSITORY_URL##*/}"
if aws ecr describe-images --profile "$AWS_PROFILE" --region "$AWS_REGION" \
  --repository-name "$ECR_REPOSITORY" --image-ids "imageTag=$IMAGE_TAG" >/dev/null 2>&1; then
  echo "Reusing existing immutable image tag $IMAGE_TAG."
else
  docker build -f apps/ecs-api/Dockerfile -t "$ECR_REPOSITORY_URL:$IMAGE_TAG" .
  docker push "$ECR_REPOSITORY_URL:$IMAGE_TAG"
fi
./scripts/seed-ecs-parameters.sh
```

Set `image_tag` to that real full SHA and `desired_count = 1`, then review the second plan. It must update the task definition **and** service before it starts the first task; there is no placeholder-running path. Apply, wait for stability, and smoke-test from the allowed IP:

```bash
terraform -chdir=infra/fargate apply
export ECS_CLUSTER="$(terraform -chdir=infra/fargate output -raw ecs_cluster_name)"
export ECS_SERVICE="$(terraform -chdir=infra/fargate output -raw ecs_service_name)"
aws ecs wait services-stable --profile "$AWS_PROFILE" --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" --services "$ECS_SERVICE"
PUBLIC_IP="$(./scripts/ecs-public-ip.sh)"
./scripts/smoke-ecs-service.sh "$PUBLIC_IP" "https://learner.example"
```

If no task runs, inspect service events, stopped-task reasons, and `/aws/ecs/<prefix>-ecs-api` logs. Never retrieve parameter values while diagnosing.

## GitHub deployment variables

Create protected environment `ecs-dev`, restrict its deployment branches to **selected branches: `main` only**, and add repository/environment variables:

- `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`
- `ECR_REPOSITORY`, `ECS_CLUSTER`, `ECS_SERVICE`
- `ECS_TASK_DEFINITION_FAMILY`, `ECS_CONTAINER_NAME=ecs-api`

Do not store AWS access keys. The workflow obtains a short-lived OIDC session. Infrastructure apply/destroy remains local and deliberate. Third-party actions are pinned to the full commits resolved from their official repositories on 2026-08-16; periodically review those pins for upstream security fixes.

After the Terraform bootstrap, GitHub owns later application task-definition revisions. Because Terraform intentionally does not ignore `task_definition`, a later `terraform plan` exposes that drift and `terraform apply` deliberately reasserts the SHA in `terraform.tfvars`. Review this before every infrastructure apply; never apply an unreviewed rollback.

The GitHub runner cannot call the public HTTP endpoint because the security group admits only the learner's `/32`. The workflow checks ECS container health. The learner must run `smoke-ecs-service.sh` to verify live, ready, unauthenticated 401, allowed CORS, and disallowed CORS.

## IAM wildcard exceptions

Repository pushes, service updates, task descriptions, and passed roles use exact repository/service/cluster/role ARNs where supported. `ecr:GetAuthorizationToken`, `ecs:DescribeTaskDefinition`, and `ecs:RegisterTaskDefinition` require `Resource = "*"`. Registration is constrained to the Region and the workflow's Fargate, non-privileged, 256-CPU/512-MiB task shape; no request tag is required because the workflow supplies none. Fargate `ecs:ListTasks` uses a wildcard because its documented resource type is a container instance, which Fargate tasks do not expose; the exact cluster condition and Region constrain it. `ecs:UpdateService` remains scoped to the exact service ARN, and OIDC trust remains restricted to the exact repository environment.

## Destroy and independent audit

Stop automated deployment first, then destroy through this state:

```bash
terraform -chdir=infra/fargate plan -destroy
terraform -chdir=infra/fargate destroy
./scripts/cleanup-ecs-task-definitions.sh "YOUR_NAME_PREFIX-ecs-api"
./scripts/delete-ecs-parameters.sh
./scripts/audit-fargate-destroy.sh "YOUR_NAME_PREFIX"
```

Confirm the destroy targets only this course root. Terraform deregisters its revision, while the exact-family cleanup removes workflow-created revisions. The audit is read-only and fails if any active/inactive family revision or matching resource remains. Also inspect ECS tasks/services, delete-in-progress definitions, ENIs/public IPv4, ECR, logs, Parameter Store, IAM, billing, and accidental Regions. Follow `course/TEARDOWN_CHECKLIST.md`.
