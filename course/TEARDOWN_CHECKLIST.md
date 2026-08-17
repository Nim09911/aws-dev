# Global Teardown and Resource Audit

Use this after every cloud lab, including labs that appear to have no idle compute. A successful application shutdown, Console deletion, or `terraform destroy` is not sufficient by itself.

> **Safety rule:** confirm account, role, Region, resource prefix, and ownership before deleting anything. Never run copied deletion commands blindly. Do not delete shared or production resources.

## Teardown record

Complete this header in private lab notes:

- Lesson:
- UTC teardown start:
- Named profile:
- Intended account alias or masked ID:
- Region:
- Resource prefix:
- Terraform root and state path, if applicable:
- Manual resources created:
- Unexpected resources or errors:

Do not commit full account IDs, credentials, secret values, Terraform state, signed URLs, or sensitive screenshots.

## 1. Verify the deletion boundary

- [ ] `aws sts get-caller-identity` shows the intended learning role and account.
- [ ] The AWS Console is in the intended Region.
- [ ] The resource prefix and standard tags match this lab.
- [ ] I identified which resources are Terraform-managed, manually managed, or externally seeded.
- [ ] I checked whether the next lesson explicitly requires a running environment. The default is full teardown.
- [ ] I exported or recorded only the non-sensitive learning evidence I need.

Do not manually delete Terraform-managed resources merely because they are visible in the Console. Destroy them from the correct Terraform root and state first, then audit for exceptions. Manually created resources and externally seeded secrets need an explicit manual path.

## 2. Stop new work before deleting dependencies

- [ ] Stop test clients, load generators, and local processes that call AWS.
- [ ] Disable GitHub deployment workflows or environments that could redeploy during teardown.
- [ ] Disable EventBridge rules or schedules that can create new work.
- [ ] Disable Lambda event source mappings before draining or deleting SQS queues.
- [ ] Stop or scale ECS services to zero when a lesson requires observation before deletion.
- [ ] Stop API or producer paths that enqueue jobs or publish events.
- [ ] Diagnose, redrive, or deliberately delete poison messages; do not leave them retrying.
- [ ] Confirm no CodeDeploy deployment or traffic shift is still active.

## 3. Destroy through the owning path

### Terraform-managed resources

For each infrastructure root used by the lesson:

- [ ] Select the correct directory and state.
- [ ] Review a destroy plan and confirm it contains only course resources.
- [ ] Run destroy and resolve errors rather than deleting state entries to hide them.
- [ ] Preserve the state only as long as needed to prove clean destruction, following the repository's secret-safe state policy.
- [ ] Record any object Terraform could not delete and move it to the manual exceptions list.

Planned independent roots are:

- `infra/fargate`
- `infra/lambda`
- `infra/sqs`
- `infra/data-events`

`infra/fargate` now exists with exact state, destroy, task-definition cleanup, and audit commands. Later infrastructure roots are added with their tracks.

### Manually managed or externally seeded resources

- [ ] Delete resources created during the manual deployment before beginning the Terraform recreation, unless the lesson explicitly imports or reuses them.
- [ ] Delete externally seeded `SecureString` values and other secrets not owned by Terraform.
- [ ] Remove manually uploaded zip artifacts, test objects, and temporary files from AWS storage.
- [ ] Record each manual exception and its final verification result.

## 4. Audit by service

Check the intended Region and any Region accidentally visited. Some account, IAM, billing, and GitHub OIDC configuration is global.

### ECS, ECR, and networking

- [ ] ECS services are deleted; no desired or running tasks remain.
- [ ] Standalone tasks are stopped.
- [ ] Fargate task-definition revisions are deregistered/deleted with `scripts/cleanup-ecs-task-definitions.sh "<prefix>-ecs-api"`; no active/inactive exact-family revisions remain.
- [ ] The course ECS cluster is deleted.
- [ ] ECR repositories, image tags, untagged images, and scanning-related artifacts are removed as required.
- [ ] Public IPv4 addresses used by tasks are released with their network interfaces.
- [ ] Load balancers, listeners, rules, target groups, and optional blue/green resources are deleted.
- [ ] NAT gateways and VPC endpoints were not accidentally created; if they were, they are deleted.
- [ ] Course network interfaces are gone before deleting security groups or subnets.
- [ ] Course security groups, subnets, route tables, internet gateways, and VPCs are removed.

Dependencies can delay network deletion. Investigate attached network interfaces and managed-service ownership instead of repeatedly forcing deletion.

### Lambda and API Gateway

- [ ] Lambda functions and unused versions are deleted.
- [ ] Lambda aliases, function URLs if accidentally created, and invocation permissions are gone.
- [ ] Event source mappings are disabled and deleted.
- [ ] API Gateway HTTP APIs, integrations, routes, deployments, and `dev`/`stage` stages are deleted.
- [ ] Provisioned concurrency was not enabled; if it was, its configuration is removed.
- [ ] CodeDeploy applications, deployment groups, revisions, and active deployments from the release lab are cleared.

### SQS

- [ ] Source queues and dead-letter queues are empty or deliberately deleted.
- [ ] Redrive tasks are complete or canceled.
- [ ] Queue policies and redrive allow policies do not remain on course queues.
- [ ] No event source mapping continues to poll.

### DynamoDB

- [ ] Course tables and global secondary indexes are deleted.
- [ ] Point-in-time recovery, backups, exports, streams, replicas, and TTL-related expectations were checked.
- [ ] No test table with a variant name or old lesson prefix remains.

TTL does not provide immediate table or lab cleanup. Delete ephemeral course data and tables through the owning path.

### EventBridge

- [ ] Rules are disabled and their targets removed.
- [ ] Course rules, custom event buses, connections, API destinations, archives, and replays are deleted if created.
- [ ] EventBridge Scheduler schedules and schedule groups are checked separately if a lab ever creates them.
- [ ] Event target DLQs and Lambda failure destinations are included in the SQS/Lambda audits.

### Systems Manager, KMS, logs, and alarms

- [ ] Course Parameter Store `String` and `SecureString` parameters are deleted.
- [ ] No advanced-tier parameter or parameter policy remains.
- [ ] Customer-managed KMS keys were not created by default; any lesson-created key follows its documented deletion schedule.
- [ ] CloudWatch log groups for ECS, Lambda, API Gateway, and course tools are deleted when the lesson requires it.
- [ ] CloudWatch alarms, dashboards, and custom metrics created by release exercises are removed.
- [ ] Log retention was not mistaken for immediate deletion.

### IAM and identity

- [ ] Course task execution, task, Lambda execution, and deployment roles are deleted when no longer used.
- [ ] Inline and attached course policies are removed.
- [ ] GitHub OIDC trust conditions were reviewed for repository, branch, and environment scope.
- [ ] Temporary course OIDC providers or roles are deleted at final course teardown if they are not intentionally reused.
- [ ] No access key was created for GitHub.

IAM resources usually have no direct hourly charge, but stale trust and permission paths are security risks and can block complete infrastructure cleanup.

### Artifacts and CI/CD

- [ ] Local and AWS-hosted Lambda deployment artifacts created for the lab are removed according to the lesson.
- [ ] ECR images no longer accumulate storage.
- [ ] GitHub Actions artifacts and caches follow an intentional retention policy.
- [ ] Workflow variables and secrets do not contain long-lived AWS credentials.
- [ ] GitHub environments cannot deploy to a deleted or unintended AWS environment.

## 5. Search for leftovers

- [ ] Search the AWS Resource Explorer if enabled and available, but do not rely on it as the only audit.
- [ ] Search by resource prefix and standard tags where the service supports them.
- [ ] Inspect Bills and Cost Explorer by service and Region.
- [ ] Check all Regions shown in billing data, not only the course Region.
- [ ] Review CloudFormation stacks in case a Console wizard created one unexpectedly.
- [ ] Review AWS Config, X-Ray, WAF, Route 53, CloudFront, ACM, Secrets Manager, Step Functions, and S3 only if a lesson, experiment, or Console wizard touched them.
- [ ] Re-open the service consoles for every resource category listed in the lesson inventory.

Search and tag indexes can lag. Direct service inspection remains necessary.

## 6. Final verification

- [ ] No course compute, public IPv4, poller, queue, table, bus/rule, load balancer, NAT gateway, or endpoint remains.
- [ ] No retained course image, artifact, parameter, log group, alarm, backup, archive, or replay remains unless explicitly documented.
- [ ] The Terraform state shows no managed resources after successful destroy.
- [ ] Manual exceptions are empty.
- [ ] The account still has the intended budget and alert coverage.
- [ ] A billing recheck is scheduled after the documented reporting delay.
- [ ] The teardown result is recorded in [Progress](PROGRESS.md).

## If deletion fails

1. Read the full dependency or permission error.
2. Confirm the owning Terraform state and current AWS identity.
3. Stop producers and detach targets, mappings, listeners, policies, or network interfaces in dependency order.
4. Retry through the owning path.
5. Do not remove an object from Terraform state solely to make destroy appear successful.
6. If the remaining object is managed by another AWS service, find and remove the parent resource first.
7. If authorization is definitively missing, stop and ask the sandbox/account administrator rather than broadening permissions blindly.

Return to [Cost Safety](COST_SAFETY.md) for unexpected-spend response steps or the [syllabus](README.md) for the next lesson.
