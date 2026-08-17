# Course Syllabus

This is the canonical course order. Complete lessons sequentially because later labs reuse identities, naming, contracts, and operational habits introduced earlier.

## Navigation and naming

Lesson paths use `course/phase-NN-name/NN-kebab-case-title.md`. The two-digit lesson number is global and must match the syllabus, page title, progress tracker, and any milestone name. Phase directories also use two digits so file explorers preserve course order.

The paths below reserve the exact destinations for every approved lesson. They are shown as code, rather than links, until the individual lesson files exist. Foundation documents are available now:

- [Prerequisites](PREREQUISITES.md)
- [Cost safety](COST_SAFETY.md)
- [Glossary](GLOSSARY.md)
- [Progress tracker](PROGRESS.md)
- [Lesson authoring template](LESSON_TEMPLATE.md)
- [Global teardown checklist](TEARDOWN_CHECKLIST.md)
- [Course home](../README.md)

## Completion standard

A lesson is complete only when you can:

- demonstrate each learning outcome without relying on a copied walkthrough;
- pass every applicable in-lesson checkpoint and record the requested evidence;
- diagnose the intentional failure from logs, metrics, CLI output, or configuration when the lesson includes one;
- complete the retrieval quiz from memory and revisit weak answers;
- tear down and audit cloud resources when the lesson creates them, or record that the cloud-resource baseline remained empty; and
- explain which primary AWS sources support the lesson's claims.

Every phase ends with a cumulative checkpoint. Do not treat resource creation alone as success.

## Track-level lesson contract

Manual deployment, CLI inspection, Terraform reproduction, and GitHub Actions delivery form a track-level sequence. An individual lesson contains only the applicable stages named in its “Lesson at a glance” section. Conceptual lessons remain complete without cloud resources when they meet their outcomes through accurate models, worked inspections, predictions, and retrieval practice. See the [lesson template](LESSON_TEMPLATE.md#sequence-contract).

## Phase baselines and recovery

Course-maintained annotated Git tags provide known source baselines:

- phase start: `course/phase-NN-start`
- phase completion: `course/phase-NN-complete`
- optional lesson recovery points: `course/lesson-NN-start` and `course/lesson-NN-complete`

`NN` is the same zero-padded number used by the syllabus. Tags identify tested repository state; checking out a tag never creates, restores, or deletes AWS resources.

These tags are a publishing contract for the future lesson phases. A foundation-only checkout may not contain them yet; verify availability with `git tag --list 'course/*'`. Course maintainers create a tag only after its source baseline and documented verification commands pass.

Every phase-start baseline expects:

- the previous required phase checkpoint is complete, except Phase 00;
- dependencies and generated local artifacts are absent unless that phase's first lesson says otherwise;
- no uncommitted learner work is required;
- **no course AWS resources are running or retained by default**; and
- the [global teardown audit](TEARDOWN_CHECKLIST.md) passed after the prior cloud lab.

Before recovery, preserve work and inspect the target tag:

```bash
git status --short
git stash push --include-untracked -m "before course phase recovery"
git fetch --tags
git show --stat course/phase-NN-start
git switch --create recovery/phase-NN course/phase-NN-start
```

Run the stash command only when `git status --short` lists work you need to preserve. Replace both `NN` values and choose a new recovery branch name if that branch already exists. Do not run `git reset --hard` or delete an existing branch as part of course recovery. If you created a stash, restore selected learner notes only after the baseline is healthy:

```bash
git stash list
git stash show --stat 'stash@{0}'
```

Then run the phase's documented install and verification commands. Separately confirm the intended AWS account and Region and re-run the teardown audit; Git recovery says nothing about cloud state. A phase-complete tag is valid only after tests and the canonical phase checkpoint pass and cloud resources are absent, unless the checkpoint explicitly documents a temporary exception.

## Phase 00 — Foundations

**Goal:** establish the safety, application, container, networking, infrastructure-as-code, and delivery concepts needed by every deployment track.

1. **[Lesson 01 — Account Safety and Course Setup](phase-00-foundations/01-account-safety-and-course-setup.md)**  
   Budgets, Free Tier alerts, MFA, CLI profiles, regions, tags, shared responsibility, and teardown habits.
2. **[Lesson 02 — IAM, Temporary Credentials, and OIDC](phase-00-foundations/02-iam-temporary-credentials-and-oidc.md)**  
   Users versus roles, permission versus trust policies, least privilege, role sessions, and GitHub OIDC.
3. **[Lesson 03 — TypeScript API Fundamentals](phase-00-foundations/03-typescript-api-fundamentals.md)**  
   Route/controller/middleware flow, health semantics, CORS, JWT authentication, typed configuration, and JSON logs.
4. **[Lesson 04 — Docker Fundamentals](phase-00-foundations/04-docker-fundamentals.md)**  
   Images, containers, layers, build context, multi-stage builds, ports, signals, health checks, ECR, and local debugging.
5. **[Lesson 05 — AWS Networking Fundamentals](phase-00-foundations/05-aws-networking-fundamentals.md)**  
   VPCs, CIDRs, subnets, routes, internet gateways, public IPv4, security groups, NACLs, and the temporary public-task trade-off.
6. **[Lesson 06 — Terraform Fundamentals](phase-00-foundations/06-terraform-fundamentals.md)**  
   Providers, resources, data sources, variables, outputs, dependency graphs, state, drift, modules, and secret-state risks.
7. **[Lesson 07 — GitHub Actions and Secure Delivery](phase-00-foundations/07-github-actions-and-secure-delivery.md)**  
   Events, jobs, runners, artifacts, caching, permissions, OIDC trust, immutable versions, and application versus infrastructure workflows.

**Phase checkpoint requirement:** Draw the developer-to-GitHub-to-AWS trust flow and a public ECS request flow from memory; identify every potentially billable resource; use the CLI to prove your identity and Region; explain why Terraform state and GitHub credentials require separate protections.

## Phase 01 — ECS Fargate

**Goal:** deploy and operate a long-running container API without hiding its network, identity, configuration, or runtime boundaries.

8. **[Lesson 08 — Build and Test the ECS API](phase-01-ecs-fargate/08-build-and-test-the-ecs-api.md)**
9. **[Lesson 09 — Manual ECS Fargate Deployment](phase-01-ecs-fargate/09-manual-ecs-fargate-deployment.md)**
10. **[Lesson 10 — Reproduce ECS Fargate with Terraform](phase-01-ecs-fargate/10-reproduce-ecs-fargate-with-terraform.md)**
11. **[Lesson 11 — ECS Delivery and Deploy-to-Destroy Capstone](phase-01-ecs-fargate/11-ecs-delivery-and-deploy-to-destroy-capstone.md)**

**Phase checkpoint requirement:** Deploy an immutable image, trace execution-role and task-role permissions, verify health/auth/configuration/logs/metrics, update the service, destroy the stack, and explain why a stopped application can still leave billable resources.

## Phase 02 — Native Lambda API

**Goal:** translate server thinking into Lambda's event-driven execution model and operate an API Gateway HTTP API across explicit environments.

12. **[Lesson 12 — Lambda Execution Model](phase-02-native-lambda-api/12-lambda-execution-model.md)**
13. **[Lesson 13 — Build the Native Lambda API](phase-02-native-lambda-api/13-build-the-native-lambda-api.md)**
14. **[Lesson 14 — Manual Lambda API, Then Terraform](phase-02-native-lambda-api/14-manual-lambda-api-then-terraform.md)**
15. **[Lesson 15 — API Gateway Stages and Promotion](phase-02-native-lambda-api/15-api-gateway-stages-and-promotion.md)**
16. **[Lesson 16 — Lambda Delivery and Runtime Comparison](phase-02-native-lambda-api/16-lambda-delivery-and-runtime-comparison.md)**

**Phase checkpoint requirement:** Invoke the handler directly and through API Gateway, distinguish cold and warm behavior, promote configuration between `dev` and `stage`, deploy a zip through OIDC, destroy the stack, and compare Lambda with Fargate using evidence.

## Phase 03 — SQS-Triggered Lambda

**Goal:** add durable asynchronous work while making delivery guarantees, retries, backpressure, IAM, and failure isolation observable.

17. **Lesson 17 — SQS Delivery and Backpressure**  
    `course/phase-03-sqs-triggered-lambda/17-sqs-delivery-and-backpressure.md`
18. **Lesson 18 — Build the Job Producer and Worker**  
    `course/phase-03-sqs-triggered-lambda/18-build-the-job-producer-and-worker.md`
19. **Lesson 19 — Partial Batches, Retries, and DLQs**  
    `course/phase-03-sqs-triggered-lambda/19-partial-batches-retries-and-dlqs.md`
20. **Lesson 20 — Terraform SQS and Async Capstone**  
    `course/phase-03-sqs-triggered-lambda/20-terraform-sqs-and-async-capstone.md`

**Phase checkpoint requirement:** Enqueue valid and poison jobs, correlate the complete processing path, observe retry and redrive, recover or remove the poison message, disable the event source mapping, destroy resources, and explain at-least-once implications.

## Phase 04 — Data, Events, and Safe Releases

**Goal:** add access-pattern-first persistence, decoupled domain events, and controlled release strategies without obscuring consistency or failure boundaries.

21. **Lesson 21 — DynamoDB Access-Pattern Design**  
    `course/phase-04-data-events-and-safe-releases/21-dynamodb-access-pattern-design.md`
22. **Lesson 22 — Build the DynamoDB Notes Repository**  
    `course/phase-04-data-events-and-safe-releases/22-build-the-dynamodb-notes-repository.md`
23. **Lesson 23 — DynamoDB Across ECS and Lambda**  
    `course/phase-04-data-events-and-safe-releases/23-dynamodb-across-ecs-and-lambda.md`
24. **Lesson 24 — EventBridge Domain Events**  
    `course/phase-04-data-events-and-safe-releases/24-eventbridge-domain-events.md`
25. **Lesson 25 — Lambda Safe Release Strategies**  
    `course/phase-04-data-events-and-safe-releases/25-lambda-safe-release-strategies.md`
26. **Lesson 26 — ECS Blue/Green Extension**  
    `course/phase-04-data-events-and-safe-releases/26-ecs-blue-green-extension.md`  
    Optional and time-boxed because load balancers and duplicate task capacity are billable while running.

**Phase checkpoint requirement:** Justify DynamoDB keys from named access patterns, demonstrate conditional-write and pagination behavior, trace a versioned event through a custom bus, prove Lambda traffic shifting and rollback, and separate queue DLQ failures from EventBridge/Lambda delivery failures.

## Phase 05 — Final Runtime Comparison

**Goal:** rebuild from empty environments and make an evidence-based architecture decision.

27. **Lesson 27 — Runtime Decision Capstone**  
    `course/phase-05-final-runtime-comparison/27-runtime-decision-capstone.md`

**Phase checkpoint requirement:** Produce and defend a decision guide covering execution, persistence, consistency, networking, scaling, IAM, observability, delivery, failure modes, operational effort, and idle cost; then verify every stack is gone.

## Phase 06 — Reusable TypeScript Deployment Templates

**Goal:** extract ordinary, copyable repositories without leaking course-specific identifiers, state, artifacts, or secrets.

28. **Lesson 28 — Extract Independent Deployment Templates**  
    `course/phase-06-reusable-templates/28-extract-independent-deployment-templates.md`
29. **Lesson 29 — Build the Template Catalog**  
    `course/phase-06-reusable-templates/29-build-the-template-catalog.md`
30. **Lesson 30 — Template Setup and Operations Guides**  
    `course/phase-06-reusable-templates/30-template-setup-and-operations-guides.md`
31. **Lesson 31 — Validate Clean Template Copies**  
    `course/phase-06-reusable-templates/31-validate-clean-template-copies.md`

The catalog will contain `ecs-fargate-api`, `lambda-http-api`, `lambda-sqs-worker`, `lambda-eventbridge-worker`, and `serverless-async-stack` under `templates/`.

**Phase checkpoint requirement:** Copy each template into a clean directory; install, lint, type-check, test, build, format, and validate it; scan for secrets and unresolved placeholders; and prove its documented destroy path.

## Reference standard

Lessons must cite primary, current sources for claims that affect security, cost, service behavior, quotas, availability, or correctness:

- AWS service Developer Guides, API references, IAM documentation, and AWS Prescriptive Guidance;
- official AWS pricing and service quota pages for cost or limit claims;
- the AWS Shared Responsibility Model and Well-Architected guidance for operational recommendations;
- official Terraform AWS provider documentation for resource semantics; and
- official GitHub documentation for Actions, permissions, environments, and OIDC.

Blog posts and community material may clarify a concept but cannot be the sole authority for a lab-critical claim. Record the page title, direct URL, and access date when behavior is likely to change. Never copy account IDs, secrets, temporary credentials, or signed URLs into lesson evidence.
