# Course Progress

Use this file as a learning record, not as a resource-creation checklist. Mark a lesson complete only after meeting the [syllabus completion standard](README.md#completion-standard), including retrieval practice and teardown.

## How to record progress

For each lesson:

1. Replace `[ ]` with `[x]` only when every lesson checkpoint passes.
2. Create one evidence file at `course/evidence/NN.md`, using the same zero-padded global lesson number as the syllabus.
3. Re-take the retrieval quiz after a delay; record the second score.
4. If teardown or the resource audit is incomplete, use `[!]` in your local notes and leave the course checkbox unchecked.

Do not commit secrets, full account IDs, temporary URLs, token-bearing command output, Terraform state, or screenshots containing sensitive values.

The `course/evidence/` directory is learner-created when individual lessons begin; it is intentionally absent from the course-foundation phase. If evidence cannot be safely committed, keep the same `NN.md` filename in a private directory and put only `Evidence: private/NN.md` in this tracker.

Every evidence file uses this contract:

```text
Lesson: NN — Title
Completed: YYYY-MM-DD
Outcomes/checkpoints: passed | list any not applicable with reason
Retrieval: first-pass N/6; delayed N/6 on YYYY-MM-DD
Evidence: test names, redacted CLI observations, diagram, failure diagnosis, or worked inspection
Cloud resources: none | inventory and owning path
Cost/teardown: not applicable | audit passed; billing recheck YYYY-MM-DD
References checked: primary-source URLs and access dates
Misconceptions to revisit: ...
```

The checkbox and evidence file are a pair: do not check a lesson whose `NN.md` record is absent or incomplete.

## Foundation readiness

- [ ] Prerequisite readiness check completed
- [ ] Approved sandbox/SSO or personal-account deferred-identity path selected
- [ ] Path A: cost visibility and named SSO profile verified; or Path B: root MFA/alerts configured and no cloud-resource work accepted before Lesson 01 identity setup
- [ ] Resource prefix and standard tags selected
- [ ] Global teardown checklist reviewed
- [ ] Lesson evidence convention and secret-safe rules reviewed

## Phase 00 — Foundations

- [ ] Lesson 01 — Account Safety and Course Setup  
  `course/phase-00-foundations/01-account-safety-and-course-setup.md`
- [ ] Lesson 02 — IAM, Temporary Credentials, and OIDC  
  `course/phase-00-foundations/02-iam-temporary-credentials-and-oidc.md`
- [ ] Lesson 03 — TypeScript API Fundamentals  
  `course/phase-00-foundations/03-typescript-api-fundamentals.md`
- [ ] Lesson 04 — Docker Fundamentals  
  `course/phase-00-foundations/04-docker-fundamentals.md`
- [ ] Lesson 05 — AWS Networking Fundamentals  
  `course/phase-00-foundations/05-aws-networking-fundamentals.md`
- [ ] Lesson 06 — Terraform Fundamentals  
  `course/phase-00-foundations/06-terraform-fundamentals.md`
- [ ] Lesson 07 — GitHub Actions and Secure Delivery  
  `course/phase-00-foundations/07-github-actions-and-secure-delivery.md`

### Phase 00 checkpoint

- [ ] Draw the developer-to-GitHub-to-AWS trust flow and a public ECS request flow from memory; identify every potentially billable resource; use the CLI to prove your identity and Region; explain why Terraform state and GitHub credentials require separate protections.
- [ ] Passed the cumulative retrieval check after a delay

**Milestone evidence:** _add date, quiz score, diagram, and misconceptions corrected_

## Phase 01 — ECS Fargate

- [ ] Lesson 08 — Build and Test the ECS API  
  `course/phase-01-ecs-fargate/08-build-and-test-the-ecs-api.md`
- [ ] Lesson 09 — Manual ECS Fargate Deployment  
  `course/phase-01-ecs-fargate/09-manual-ecs-fargate-deployment.md`
- [ ] Lesson 10 — Reproduce ECS Fargate with Terraform  
  `course/phase-01-ecs-fargate/10-reproduce-ecs-fargate-with-terraform.md`
- [ ] Lesson 11 — ECS Delivery and Deploy-to-Destroy Capstone  
  `course/phase-01-ecs-fargate/11-ecs-delivery-and-deploy-to-destroy-capstone.md`

### Phase 01 checkpoint

- [ ] Deploy an immutable image, trace execution-role and task-role permissions, verify health/auth/configuration/logs/metrics, update the service, destroy the stack, and explain why a stopped application can still leave billable resources.
- [ ] Passed the cumulative retrieval check after a delay

**Milestone evidence:** _add date, quiz score, deployment revision, redacted observations, and teardown audit_

## Phase 02 — Native Lambda API

- [ ] Lesson 12 — Lambda Execution Model  
  `course/phase-02-native-lambda-api/12-lambda-execution-model.md`
- [ ] Lesson 13 — Build the Native Lambda API  
  `course/phase-02-native-lambda-api/13-build-the-native-lambda-api.md`
- [ ] Lesson 14 — Manual Lambda API, Then Terraform  
  `course/phase-02-native-lambda-api/14-manual-lambda-api-then-terraform.md`
- [ ] Lesson 15 — API Gateway Stages and Promotion  
  `course/phase-02-native-lambda-api/15-api-gateway-stages-and-promotion.md`
- [ ] Lesson 16 — Lambda Delivery and Runtime Comparison  
  `course/phase-02-native-lambda-api/16-lambda-delivery-and-runtime-comparison.md`

### Phase 02 checkpoint

- [ ] Invoke the handler directly and through API Gateway, distinguish cold and warm behavior, promote configuration between `dev` and `stage`, deploy a zip through OIDC, destroy the stack, and compare Lambda with Fargate using evidence.
- [ ] Passed the cumulative retrieval check after a delay

**Milestone evidence:** _add date, quiz score, comparison notes, and teardown audit_

## Phase 03 — SQS-Triggered Lambda

- [ ] Lesson 17 — SQS Delivery and Backpressure  
  `course/phase-03-sqs-triggered-lambda/17-sqs-delivery-and-backpressure.md`
- [ ] Lesson 18 — Build the Job Producer and Worker  
  `course/phase-03-sqs-triggered-lambda/18-build-the-job-producer-and-worker.md`
- [ ] Lesson 19 — Partial Batches, Retries, and DLQs  
  `course/phase-03-sqs-triggered-lambda/19-partial-batches-retries-and-dlqs.md`
- [ ] Lesson 20 — Terraform SQS and Async Capstone  
  `course/phase-03-sqs-triggered-lambda/20-terraform-sqs-and-async-capstone.md`

### Phase 03 checkpoint

- [ ] Enqueue valid and poison jobs, correlate the complete processing path, observe retry and redrive, recover or remove the poison message, disable the event source mapping, destroy resources, and explain at-least-once implications.
- [ ] Passed the cumulative retrieval check after a delay

**Milestone evidence:** _add date, quiz score, correlation notes, failure diagnosis, and teardown audit_

## Phase 04 — Data, Events, and Safe Releases

- [ ] Lesson 21 — DynamoDB Access-Pattern Design  
  `course/phase-04-data-events-and-safe-releases/21-dynamodb-access-pattern-design.md`
- [ ] Lesson 22 — Build the DynamoDB Notes Repository  
  `course/phase-04-data-events-and-safe-releases/22-build-the-dynamodb-notes-repository.md`
- [ ] Lesson 23 — DynamoDB Across ECS and Lambda  
  `course/phase-04-data-events-and-safe-releases/23-dynamodb-across-ecs-and-lambda.md`
- [ ] Lesson 24 — EventBridge Domain Events  
  `course/phase-04-data-events-and-safe-releases/24-eventbridge-domain-events.md`
- [ ] Lesson 25 — Lambda Safe Release Strategies  
  `course/phase-04-data-events-and-safe-releases/25-lambda-safe-release-strategies.md`
- [ ] Lesson 26 — ECS Blue/Green Extension  
  `course/phase-04-data-events-and-safe-releases/26-ecs-blue-green-extension.md`
  Optional, billable, and time-boxed.

### Phase 04 checkpoint

- [ ] Justify DynamoDB keys from named access patterns, demonstrate conditional-write and pagination behavior, trace a versioned event through a custom bus, prove Lambda traffic shifting and rollback, and separate queue DLQ failures from EventBridge/Lambda delivery failures.
- [ ] Passed the cumulative retrieval check after a delay

**Milestone evidence:** _add date, quiz score, design notes, rollback proof, and teardown audit_

## Phase 05 — Final Runtime Comparison

- [ ] Lesson 27 — Runtime Decision Capstone  
  `course/phase-05-final-runtime-comparison/27-runtime-decision-capstone.md`

### Phase 05 checkpoint

- [ ] Produce and defend a decision guide covering execution, persistence, consistency, networking, scaling, IAM, observability, delivery, failure modes, operational effort, and idle cost; then verify every stack is gone.
- [ ] Passed a cumulative retrieval quiz covering the complete course

**Milestone evidence:** _add date, decision guide, quiz score, and final account audit_

## Phase 06 — Reusable TypeScript Deployment Templates

- [ ] Lesson 28 — Extract Independent Deployment Templates  
  `course/phase-06-reusable-templates/28-extract-independent-deployment-templates.md`
- [ ] Lesson 29 — Build the Template Catalog  
  `course/phase-06-reusable-templates/29-build-the-template-catalog.md`
- [ ] Lesson 30 — Template Setup and Operations Guides  
  `course/phase-06-reusable-templates/30-template-setup-and-operations-guides.md`
- [ ] Lesson 31 — Validate Clean Template Copies  
  `course/phase-06-reusable-templates/31-validate-clean-template-copies.md`

### Phase 06 checkpoint

- [ ] Copy each template into a clean directory; install, lint, type-check, test, build, format, and validate it; scan for secrets and unresolved placeholders; and prove its documented destroy path.
- [ ] Passed the final delayed retrieval and template-operability review

**Milestone evidence:** _add date, validation output summary, scan result, and review notes_

## Ongoing review log

After each delayed quiz, record only the concepts that need another retrieval attempt:

- **Date / lesson:** misconception → corrected model → next review date

Return to the [course syllabus](README.md) for phase order and completion requirements.
