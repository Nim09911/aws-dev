# Cost-Safe TypeScript Lambda Learning Plan

Build a native TypeScript Lambda API behind API Gateway HTTP API, then deploy it with Terraform and GitHub Actions. Preserve the health, JSON logging, Parameter Store, IAM, and built-in metrics goals from the Fargate plan while learning Lambda’s event-driven model.

Lambda is not a continuously running server. API Gateway receives HTTPS requests and invokes a handler; execution environments may be created, reused, or removed at any time.

Estimated effort: 10–18 focused hours.

## 1. Establish the serverless model and cost guardrails
- Reuse the AWS region, tagging, budget alerts, learning identity, and teardown discipline from Plan 1.
- Use API Gateway HTTP API rather than REST API for the basic proxy use case.
- Lambda and HTTP API have no minimum or idle runtime fee; usage, CloudWatch log retention, Parameter Store choices, and optional custom domains can still cost money.
- Skip Route 53, custom domains, provisioned concurrency, VPC attachment, custom metrics, and X-Ray initially.

## 2. Build a native TypeScript HTTP handler
- Implement an `APIGatewayProxyEventV2` handler and explicit routes for `GET /health/live`, `GET /health/ready`, and a protected `GET /api/hello` example.
- Keep a small route → middleware → controller structure under `src/routes`, `src/middleware`, and `src/controllers`, but return API Gateway version 2 responses rather than starting an HTTP listener.
- Treat Lambda health semantics accurately: these endpoints confirm API reachability, handler execution, and required configuration; they are not container liveness/readiness probes.
- Add CORS at API Gateway, JWT authentication middleware, consistent JSON responses, centralized error mapping, and tests using realistic API Gateway events.

## 3. Add configuration and Parameter Store
- Validate ordinary Lambda environment variables such as service name, environment, and parameter paths at module initialization.
- Store configuration in standard-tier Parameter Store, using `String` for ordinary values and `SecureString` for the JWT secret.
- Retrieve parameters with the Lambda execution role and cache them across warm invocations using AWS Lambda Powertools Parameters.
- Grant only scoped `ssm:GetParameter`/`ssm:GetParameters` permissions and `kms:Decrypt` only if a customer-managed KMS key is used.
- Keep secret values out of source control and ordinary Terraform state.

## 4. Add logs and built-in metrics
- Emit structured JSON for module initialization/cold start, handler invocation, request completion, and errors.
- Include request ID, route, status, duration, service version, and cold-start state without logging tokens or parameter values.
- Pre-create the CloudWatch log group in Terraform with short retention.
- Inspect Lambda’s built-in `Invocations`, `Errors`, `Duration`, `Throttles`, and `ConcurrentExecutions` metrics plus API Gateway request, latency, and error metrics.
- Do not publish paid custom metrics or enable extra observability products initially.

## 5. Package and deploy manually once
- Bundle TypeScript into a small JavaScript zip artifact with source maps and deterministic dependencies; do not use a Docker image for this plan.
- Manually create or inspect the Lambda function, execution role, API Gateway HTTP API integration, routes, Lambda invocation permission, and default stage once.
- Invoke the handler directly with a saved event, then through API Gateway’s built-in HTTPS `execute-api` endpoint.
- Verify health, CORS, authentication, logs, metrics, cold start, and warm reuse.
- Delete the function, API, logs, parameters, and artifact after the exercise.

## 6. Rebuild the stack with Terraform
- Define IAM, Lambda, log group, API Gateway v2 API/integration/routes/stage, Lambda permission, and Parameter Store references under `lambda-infra`.
- Start with local state, apply the stack, smoke-test it, change configuration, deploy again, inspect the plan, and destroy it.
- Output only the API URL and non-sensitive identifiers.
- Include a post-destroy check for Lambda functions, API Gateway APIs, log groups, parameters, and artifacts.

## 7. Add GitHub Actions securely
- Add CI for install, lint, type-check, tests, and bundle-size verification.
- Use GitHub OIDC with a repository/environment-restricted trust policy and a least-privilege Lambda deployment role.
- Keep infrastructure apply/destroy manual while learning. When the environment exists, deploy function code and run health/auth smoke tests.

## 8. Complete the deploy-to-destroy capstone
- From an empty environment: apply Terraform, seed Parameter Store, deploy via GitHub Actions, call the API, inspect JSON logs and metrics, rotate configuration, observe cache behavior, deploy a second version, and destroy all resources.
- Compare Lambda with Fargate: request lifecycle, cold starts, configuration loading, IAM identity, logs/metrics, scaling ownership, deployment artifact, network exposure, and idle cost.

## Deferred follow-up
- Custom domains/Route 53, JWT authorizers or Cognito, throttling, WAF, X-Ray, custom metrics, alarms, provisioned concurrency, aliases/canaries, environment isolation, code signing, supply-chain security, and persistence.

## References
- [TypeScript Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/lambda-typescript.html)
- [API Gateway Lambda integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html)
- [Powertools Parameters for TypeScript](https://docs.aws.amazon.com/powertools/typescript/latest/features/parameters/)
- [Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/)
- [GitHub Actions OIDC for AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)
