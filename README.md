# AWS Developer: Deploy, Automate, Operate

A guided, cost-conscious AWS course for a programmer with roughly three years of development experience, AWS Certified Cloud Practitioner knowledge, and limited DevOps practice.

The course builds one evolving TypeScript system while making the operational boundaries visible. Across each deployment track, you will create the important AWS deployment manually once, inspect it with the AWS CLI, reproduce it with Terraform, and automate application delivery with GitHub Actions and short-lived AWS credentials.

> **Current status:** foundations and the ECS Fargate track are ready, including Lessons 01–11, cost-safe Terraform, operational scripts, CI, and OIDC application delivery. Later tracks remain planned.

## Start here

1. Read the [prerequisites and workstation setup](course/PREREQUISITES.md).
2. Put the [cost and account safety controls](course/COST_SAFETY.md) in place before creating cloud resources.
3. Follow the [sequential syllabus](course/README.md); do not skip phase checkpoints.
4. Record evidence in the [progress tracker](course/PROGRESS.md).
5. Keep the [teardown checklist](course/TEARDOWN_CHECKLIST.md) open during every cloud lab.
6. Use the [glossary](course/GLOSSARY.md) when similar AWS terms blur together.

Course authors should begin with the [lesson template](course/LESSON_TEMPLATE.md).

## Local application checks

Run `npm run check` for linting, formatting, type checking, unit tests, and TypeScript builds. Docker is intentionally separate from that command:

```sh
npm run docker:verify:ecs
```

This builds `aws-course-ecs-api:local`, starts it with ephemeral configuration and a random loopback port, verifies live/ready responses, unauthenticated 401, and allowed/disallowed CORS behavior, then removes the container.

## How the course works

Each practical deployment **track** completes the same learning loop across a sequence of lessons:

1. **Model** — explain the request, event, network, identity, deployment, and failure flows.
2. **Build locally** — test the smallest useful TypeScript behavior before involving AWS.
3. **Deploy manually once** — create the minimum resources in the AWS Console so their relationships are visible.
4. **Inspect** — use the AWS CLI, logs, metrics, and resource configuration to verify what AWS created.
5. **Reproduce with Terraform** — express the same system as reviewable infrastructure and observe plan, state, drift, and destroy behavior.
6. **Automate delivery** — use GitHub Actions with OIDC and least-privilege roles; keep infrastructure apply and destroy deliberate while learning.
7. **Break and recover** — trigger a bounded failure, diagnose it from evidence, and verify the recovery path.
8. **Tear down and audit** — remove resources and independently confirm that no course resource remains.
9. **Retrieve** — answer the lesson quiz without notes and explain the design trade-offs in your own words.

An individual lesson includes only the stages that serve its stated outcomes. Conceptual lessons may stop after modeling, inspection, and retrieval; build lessons may remain local; deployment lessons may cover manual AWS and CLI inspection; later lessons add Terraform and GitHub Actions. A lesson must label omitted stages as not applicable or deferred rather than inventing cloud work to satisfy the template.

The track sequence is intentional: manual deployment builds a concrete mental model, Terraform makes it repeatable, and GitHub Actions automates only what you can already explain.

## What you will build

- A long-running TypeScript HTTP API on ECS Fargate.
- A native TypeScript Lambda API behind API Gateway HTTP API.
- An asynchronous API-to-SQS-to-Lambda job flow with retries and a dead-letter queue.
- A DynamoDB-backed repository and an EventBridge consumer.
- A cost-safe Lambda canary release, plus an optional ECS blue/green architecture exercise.
- Independent, copyable TypeScript deployment templates.

The final capstone rebuilds the stacks from empty environments and compares execution model, scaling, networking, data access, consistency, IAM, observability, deployments, failure modes, and idle cost.

## Course boundaries

The default labs favor short-lived resources and built-in service telemetry. They avoid NAT gateways, persistent load balancers, Route 53, paid Container Insights, provisioned concurrency, and custom metrics unless a later lesson explicitly introduces and removes them.

AWS Free Tier eligibility does **not** guarantee a zero bill. Budgets and alerts report spend; they are not hard spending caps. Always follow the cost guide and teardown audit.

This repository deliberately keeps runtime applications separate. Shared packages hold contracts and a narrow data-access boundary, not hidden runtime behavior. Infrastructure roots are independent so each stack can be planned, applied, and destroyed on its own.

## Source roadmaps

The approved course expands these original roadmaps without replacing them:

- [Cost-Safe AWS ECS Learning Plan](plans/01-ecs-fargate.md)
- [Cost-Safe TypeScript Lambda Learning Plan](plans/02-lambda-api.md)
- [Cost-Safe SQS-Triggered Lambda Learning Plan](plans/03-sqs-lambda.md)

When course material and AWS behavior appear to disagree, pause the lab and verify the behavior against current, primary AWS documentation before proceeding.
