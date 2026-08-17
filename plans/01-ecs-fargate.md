# Cost-Safe AWS ECS Learning Plan

Build a basic TypeScript server and deploy it through local Docker, ECS Fargate, Terraform, and GitHub Actions. The first scope includes health checks, JSON startup logs, free built-in ECS metrics, Parameter Store, and IAM; production hardening remains explicitly deferred.

Estimated effort: 15–25 focused hours.

## 1. Establish cost and security guardrails
- Choose one AWS region and a consistent `project`, `environment`, and `owner` tag scheme.
- Enable Free Tier alerts and create both a zero-spend budget and a small monthly cost alert before deploying anything.
- Use a non-root learning role with MFA; never create access keys for GitHub.
- Define a teardown checklist covering ECS services/tasks, public IPv4 addresses, ECR images, Parameter Store values, and CloudWatch log groups.
- Treat “no idle costs” precisely: VPCs, route tables, security groups, NACLs, IAM roles, an empty ECS cluster, and standard-tier Parameter Store values have no direct hourly charge; running Fargate tasks, public IPv4 addresses, retained images, logs, and state storage can cost money.

## 2. Build the TypeScript application locally
- Create a basic API with `/health/live`, `/health/ready`, and a small protected example route to preserve the route → middleware → controller learning flow without adding a database.
- Organize it under `src/routes`, `src/controllers`, and `src/middleware`, with configuration validated at startup.
- Add a single typed environment loader under `src/config`, fail fast on missing/invalid values, commit only `.env.example`, and keep local `.env` ignored.
- Emit structured JSON startup logs containing service name, version, environment, port, and readiness state without logging secrets.
- Add minimal request logging, CORS allowlisting, JWT authentication middleware, centralized error handling, and focused tests.

## 3. Containerize and understand the artifact
- Write a straightforward multi-stage `Dockerfile` with deterministic installs, production-only dependencies, and health checking.
- Add `.dockerignore`, build locally, inspect the image, run it with explicit environment variables, and verify health/auth/CORS behavior.
- Learn the boundary between Docker image, ECS task definition, ECS task, ECS service, cluster, and capacity provider.

## 4. Perform one manual Fargate deployment
- Push a versioned image to ECR and manually create the minimum ECS resources once so their relationships are visible.
- Use a temporary public-subnet task with a tightly restricted security group and public IP for the first lab; avoid NAT gateway and ALB charges at this stage.
- Store ordinary settings as Parameter Store `String` values and sensitive settings such as the JWT signing secret as `SecureString`; use standard-tier parameters.
- Inject parameters through the ECS task definition `secrets` field. Grant the task execution role narrowly scoped `ssm:GetParameters` access and `kms:Decrypt` only if a customer-managed KMS key is introduced.
- Distinguish the ECS task execution role, application task role, and human/deployment role.
- Inspect the JSON startup event in CloudWatch Logs, run health and auth smoke tests, rotate a parameter, and force a new ECS deployment.
- View the free ECS service-level `CPUUtilization` and `MemoryUtilization` metrics. Do not enable paid Container Insights or custom application metrics.
- Delete the service/task, parameters, images, and logs after the lab.

## 5. Rebuild the Fargate environment in Terraform
- Create readable Terraform configuration for VPC, subnets, internet gateway, routes, security groups, ECS cluster/service/task definition, ECR, IAM, Parameter Store references, and logs under `infra`.
- Do not place secret values in committed variables or ordinary Terraform-managed arguments where they can persist in state. Seed ephemeral `SecureString` values separately and delete them during teardown.
- Start with local state. Add remote S3 state and native S3 lockfiles only when shared state is genuinely needed; do not introduce the deprecated DynamoDB locking pattern.
- Keep the default NACL initially, then perform a focused stateless-NACL exercise. Use security groups as the primary workload firewall.
- Practice `fmt`, `validate`, `plan`, `apply`, drift observation, and `destroy`; verify the account after every destroy.

## 6. Add GitHub Actions securely
- Create separate CI and deployment workflows: test/type-check/build first; then image build, immutable ECR tag, task-definition update, ECS deployment, and smoke test.
- Authenticate through GitHub OIDC with a repository/environment-restricted IAM trust policy and least-privilege deployment role—no long-lived AWS secrets.
- Keep infrastructure apply/destroy manual while learning. Run deployment workflows only while an environment is intentionally provisioned.

## 7. Complete the basic Fargate capstone
- From an empty environment: apply infrastructure, seed Parameter Store, deploy through GitHub Actions, exercise health/auth/CORS, rotate configuration, inspect JSON logs and ECS metrics, roll out a second image, then destroy everything.
- Draw the request, deployment, network, and IAM trust flows from memory and document which resources can continue billing after application traffic stops.

## Deferred follow-up
- ALB, HTTPS/ACM, Route 53, private subnets/NAT or VPC endpoints, autoscaling, auditability, environment isolation, data persistence, advanced container security, custom metrics, and Container Insights.

## References
- [AWS Fargate for ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [ECS environment variables from Parameter Store](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html)
- [Parameter Store pricing](https://aws.amazon.com/systems-manager/pricing/)
- [GitHub Actions OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
- [AWS budget templates](https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html)
- [VPC pricing](https://aws.amazon.com/vpc/pricing/)
