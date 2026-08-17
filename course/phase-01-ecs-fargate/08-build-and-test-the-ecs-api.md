# Lesson 08 — Build and Test the ECS API

## Lesson at a glance
- **Stages/time:** local build → tests → Docker smoke → failure recovery; 90–120 minutes
- **Prerequisite:** [Lesson 07](../phase-00-foundations/07-github-actions-and-secure-delivery.md)
- **Requirements:** Node 24/npm, Docker, OpenSSL
- **Outcomes:** prove the API/config/auth contract and produce a non-root, healthy local image ready for immutable ECR tagging.

> **Cost box:** Local-only. No AWS resource, image storage, task, log ingestion, or public IPv4 is created. Docker host resources remain local.

## Track position and architecture
This is the local-build stage. Lesson 09 manually uploads/deploys it; 10 owns infrastructure; 11 automates image delivery.

```mermaid
flowchart LR
  Tests --> TypeScript --> Image[ecs-api image]
  Config[port + metadata + CORS + JWT] --> Container
  Client --> Live[/health/live]
  Client --> Ready[/health/ready]
  Client -->|Bearer JWT| Hello[/hello]
```

The runtime contract is exact: TCP 3000; port; service name/version/environment; exact HTTPS CORS origins; JWT public key/issuer/audience; JSON logs to stdout. Startup logs include service, version, environment, port, and readiness. Public health endpoints prove process/readiness; `/hello` proves the authentication boundary.

## Part 1 — verify source
Trace `main.ts → loadEcsConfig/createJwtValidator/createApp → middleware/routes`. Then:

```bash
npm ci
npm run lint
npm run typecheck
npm test -- apps/ecs-api/test
npm run build
```

Expected tests cover health 200/503, unauthenticated 401, authenticated identity, malformed tokens, and config rejection without exposing values.

## Part 2 — image exercise
```bash
npm run docker:build:ecs
npm run docker:smoke:ecs
docker image inspect aws-course-ecs-api:local \
  --format 'user={{.Config.User}} ports={{json .Config.ExposedPorts}}'
```

Expected: live/ready/auth/allowed-CORS/disallowed-CORS smoke passes, `user=node`, `3000/tcp`. Inspect history and confirm no key/value was copied. Record the local image ID; it is not the deployment version. Lesson 09 tags with a full commit SHA.

### Checkpoint
- [ ] Root `npm run check` passes.
- [ ] Docker smoke proves live, ready, unauthenticated 401, and both CORS cases.
- [ ] I can list all eight env fields and explain which contains key material.
- [ ] Runtime is non-root and logs go to stdout.
- **Evidence:** test names, image ID, runtime user, and redacted startup metadata—never values.

## Bounded failure lab — malformed key configuration
Time box: 8 minutes. Run the container with `JWT_PUBLIC_KEY_BASE64=bm90LWEtcGVt` and valid-looking issuer/audience. Predict an immediate startup failure naming only the bad field. Observe container exit/logs, remove it, then run the standard smoke. Never log or commit a real private key.

## Teardown and audit
`docker ps -a` must show no lesson container. Remove temporary keys and optionally the image. Run `git status --short` and ensure no `.env`, PEM, token, or generated secret appears. Cloud resources created: none.

## Retrieval quiz
1. Exact ECS environment schema categories?
2. Why are live and ready separate?
3. What proves auth is closed by default?
4. Where should logs go in ECS?
5. Why isn't local image ID the delivery tag?
6. What state carries to Lesson 09?

<details><summary>Answer key</summary>

1. Port; service name/version/environment; CORS origins; JWT public key/issuer/audience. 2. Restart decision differs from traffic eligibility. 3. `/hello` without a bearer token returns 401. 4. stdout/stderr for `awslogs`. 5. Delivery needs source-traceable full SHA. 6. Tested source/image contract, not a running cloud resource.
</details>

## Authoritative references
- [ECS container definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html), [health checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html) — deployment contract; accessed 2026-08-16.
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/) — image/runtime behavior; accessed 2026-08-16.

## Next lesson
Continue to [Lesson 09](09-manual-ecs-fargate-deployment.md). Keep AWS empty until its safety gate.
