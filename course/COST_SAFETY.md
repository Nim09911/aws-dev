# Cost and Account Safety

Read this guide before Lesson 01, complete the account-level alerts available to your starting path, and revisit it before every cloud lab. Lesson 01 completes any non-root identity or billing-access setup deferred by [Prerequisites](PREREQUISITES.md).

> **Budgets, Free Tier alerts, and billing notifications are not hard spending caps.** Usage and cost data can be delayed. You remain responsible for stopping and deleting resources.

This course minimizes default cost; it cannot promise a zero bill. Prices, Free Tier offers, taxes, credits, and account eligibility change. Verify current prices for your selected Region on official AWS pages immediately before each lab.

## 1. Use the right account and identity

- Use a dedicated learning account or an approved sandbox with no production resources.
- Enable root-user MFA and protect the root email. In a personal account, root may be used only for bootstrap tasks that require it; never create root CLI access keys or use root for course labs.
- Use the approved IAM Identity Center/sandbox path from [Prerequisites](PREREQUISITES.md), or defer non-root identity creation to Lessons 01–02 and create no lab resources until its checkpoint passes.
- Use temporary role credentials with MFA or federation where supported.
- Restrict the learning role as the course progresses; do not treat administrator access as a permanent solution.
- Never create or store AWS access keys for GitHub. The delivery lessons use GitHub OIDC and restricted role trust.
- Confirm the account, role ARN, named profile, and Region before every deployment.

Stop immediately if `aws sts get-caller-identity --profile "$AWS_PROFILE"` shows an unexpected account or identity.

## 2. Configure billing visibility before deploying

In Billing and Cost Management, either through your approved identity or with the sandbox administrator:

- enable AWS Free Tier usage alerts where available for the account;
- create a zero-spend budget or equivalent early-warning budget;
- create a small monthly cost budget at a personally meaningful threshold;
- send alerts to an email address you actively monitor;
- add forecasted and actual-spend thresholds where the account supports them;
- confirm the subscription from the notification service when required; and
- test that you can find Bills, Cost Explorer, Budgets, and Free Tier usage views.

A “zero-spend” budget is a notification strategy, not an enforcement mechanism. Budget actions also have scope and service limitations; do not depend on them to stop every resource.

Record the budget names and notification recipients in private lab notes. Do not commit personal email addresses or account identifiers.

## 3. Establish one cost boundary

Use one supported AWS Region for the course. Every command, Console session, Terraform provider, and audit must use that Region explicitly.

Use a unique resource prefix and the standard tags from [Prerequisites](PREREQUISITES.md), including `course-lesson` and `expires-at`. Tags improve attribution but are not supported by every resource and do not replace a service-by-service audit.

Set a time box before creating resources:

- note the UTC start and intended teardown time;
- set a calendar reminder before the lab ends;
- keep the [teardown checklist](TEARDOWN_CHECKLIST.md) open; and
- do not start a billable lab if you cannot stay through teardown and verification.

## 4. Know what can keep costing money

### ECS Fargate track

The default lab avoids NAT gateways and a persistent Application Load Balancer. It uses a temporary public-subnet task so the network relationship is visible without those default-lab costs.

Review and remove:

- running Fargate tasks and ECS services with nonzero desired count;
- public IPv4 addresses associated with running tasks;
- ECR image storage and image scanning options;
- CloudWatch Logs ingestion and retained log storage;
- Parameter Store parameters, especially non-standard tiers or policies; and
- any load balancer, target group, NAT gateway, VPC endpoint, or extra capacity created outside the guided default.

Standard Parameter Store parameters currently have no parameter storage charge. Advanced parameters, higher-throughput/API options, associated KMS use, and future pricing can incur charges; verify the current Systems Manager pricing page rather than treating “standard” as a permanent zero-cost guarantee.

An empty ECS cluster, VPC, route table, security group, NACL, IAM role, or internet gateway generally has no direct hourly charge, but it can hide attached billable resources and should still be removed after an ephemeral lab.

### Lambda and API Gateway track

Lambda and API Gateway HTTP API are usage-metered rather than charging for an idle server, but invocations, duration, requests, logs, data transfer, and optional features can incur cost.

Review and remove:

- Lambda functions, versions, aliases, and provisioned concurrency if accidentally enabled;
- API Gateway APIs and explicit stages;
- CloudWatch log groups and alarms;
- Parameter Store values;
- deployment artifacts retained locally or in AWS storage; and
- custom domains, Route 53 resources, WAF, X-Ray, or other extensions not included in the default lab.

The course does not use provisioned concurrency, custom domains, Route 53, paid custom metrics, or X-Ray in default Lambda labs.

### SQS-triggered Lambda track

SQS has no minimum server charge, but API requests are metered. An enabled Lambda event source mapping long-polls the queue even when no application jobs are arriving. Free Tier allowance does not guarantee a zero bill.

Review and remove:

- event source mappings, or disable them immediately when pausing a lab;
- source queues and dead-letter queues, including retained messages;
- producer and worker Lambda functions and log groups;
- API Gateway routes and APIs; and
- poison messages that keep retrying.

Stop message producers and disable polling before deleting downstream resources.

### DynamoDB, EventBridge, and release labs

The course uses DynamoDB on-demand capacity and an ephemeral table. Requests, storage, backups, streams, exports, and optional features can still incur charges.

Review and remove:

- DynamoDB tables, global secondary indexes, backups, exports, and streams;
- EventBridge custom buses, rules, targets, archives, replays, and Scheduler schedules if created;
- Lambda versions, aliases, CodeDeploy applications/deployment groups, and CloudWatch alarms;
- failure destinations and dead-letter queues; and
- optional ECS blue/green load balancers, target groups, and duplicate task capacity.

The ECS blue/green lesson is optional, time-boxed, and explicitly billable. Do not begin it without checking current ALB, public IPv4, Fargate, and data-processing prices.

### Terraform and delivery

Local Terraform state has no AWS service charge, but the infrastructure represented by it does. Losing state can make safe teardown harder.

- Keep each infrastructure root independent.
- Review `terraform plan` before apply and note every resource category.
- Do not put secret values in committed variables or ordinary Terraform-managed arguments.
- Keep apply and destroy deliberate while learning; deployment workflows run only while the intended environment exists.
- Treat successful `terraform destroy` as one signal, then perform an independent AWS resource audit.

GitHub Actions usage and artifact retention can have separate plan limits or charges. Review current GitHub billing documentation as well as AWS pricing.

## 5. Use a before/during/after routine

### Before

- [ ] Confirm the intended account, role, profile, and Region.
- [ ] Check current Bills, Cost Explorer, budget status, and Free Tier usage.
- [ ] Read the lesson cost warning and current official pricing pages.
- [ ] List every resource the lesson will create, including logs and artifacts.
- [ ] Set the lab end time and teardown reminder.
- [ ] Confirm no unrelated resources share the course prefix.

### During

- [ ] Keep the resource inventory current.
- [ ] Use immutable versions rather than accumulating ambiguous artifacts.
- [ ] Use built-in service metrics; do not enable paid observability by habit.
- [ ] Stop if the architecture differs from the lesson or the Console proposes extra resources.
- [ ] Investigate alerts immediately; do not assume a small charge will stop by itself.

### After

- [ ] Stop producers and triggers first.
- [ ] Complete lesson-specific teardown, then the [global checklist](TEARDOWN_CHECKLIST.md).
- [ ] Audit every Region accidentally visited as well as the intended Region.
- [ ] Check global services and retained logs, images, parameters, queues, tables, alarms, and artifacts.
- [ ] Revisit billing views after their documented reporting delay.
- [ ] Leave the lesson incomplete in [Progress](PROGRESS.md) until the audit passes.

## 6. Respond to unexpected spend

If an alert or unexplained charge appears:

1. stop the lab and preserve only non-sensitive evidence;
2. confirm the account and inspect Bills by service and Region;
3. disable producers, event source mappings, schedules, and desired compute;
4. delete identified resources using the correct manual or Terraform ownership path;
5. audit all Regions and relevant global services;
6. rotate or revoke credentials if unauthorized use is possible;
7. contact AWS Support through the account if the charge remains unexplained; and
8. do not resume until the cause and teardown gap are understood.

## Authoritative cost references

Check these sources at lab time:

- [AWS Free Tier](https://aws.amazon.com/free/)
- [Tracking Free Tier usage](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html)
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [AWS pricing overview](https://aws.amazon.com/pricing/)
- [AWS Pricing Calculator](https://calculator.aws/)
- [Amazon VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/)
- [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [Amazon API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/)
- [Amazon SQS pricing](https://aws.amazon.com/sqs/pricing/)
- [Amazon DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/)
- [Amazon EventBridge pricing](https://aws.amazon.com/eventbridge/pricing/)
- [Amazon CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [AWS Systems Manager pricing](https://aws.amazon.com/systems-manager/pricing/)
- [Amazon ECR pricing](https://aws.amazon.com/ecr/pricing/)

Pricing pages are authoritative for current rates; lesson prose should explain cost drivers without freezing transient prices into the repository.
