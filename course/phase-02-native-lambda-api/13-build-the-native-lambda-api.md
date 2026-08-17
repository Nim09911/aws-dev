# Lesson 13 — Build the Native Lambda API

## Lesson at a glance
- **Stages/time:** local contract → test-first handler/config/cache → deterministic package → failure recovery; 90–120 minutes
- **Prerequisite:** [Lesson 12](12-lambda-execution-model.md)
- **Requirements:** Node 24/npm, Bash, `zip`, OpenSSL; no AWS credentials
- **Outcomes:** prove payload-v2 routing, health/auth/job behavior, bounded Parameter Store caching, safe correlation logs, and a repeatable zip artifact.

> **Cost box:** Local-only. No function, API, queue, parameter, role, or log group is created. Generated `artifacts/` and compiled `dist/` files are local and ignored.

## Local architecture and contracts
```mermaid
flowchart LR
  Event[payload v2 test event] --> Handler
  Handler --> Live[/health/live]
  Handler --> Ready[/health/ready]
  Handler --> Auth[/api/hello]
  Handler --> Jobs[POST /jobs]
  Ready --> Cache[per-stage bounded cache]
  Auth --> Cache
  Jobs --> Shared[@aws-course/contracts]
```

The application keeps dependency injection at the handler boundary. Tests inject auth, readiness, queue sending, IDs, time, and logging. Production `index.ts` creates SSM/SQS clients once at module scope, but no unit test needs AWS credentials or a network call.

Ordinary Lambda environment fields are exactly:

- `SERVICE_NAME`;
- `JOB_QUEUE_URL`;
- `JWT_PARAMETER_BASE_PATH`; and
- `PARAMETER_CACHE_TTL_SECONDS` (5–300 seconds).

Auth values are never ordinary environment variables. For each request stage, runtime retrieval expects three externally seeded names below the base: `/<stage>/jwt-public-key-base64`, `jwt-issuer`, and `jwt-audience`. The key is a SecureString value; issuer/audience are Strings. The loader asks for decryption, validates the RSA public key/issuer/audience, and emits only field names on failure.

## Part 1 — run the contract tests
```bash
npm ci
npm test -- apps/lambda-api/test
npm run typecheck
```

Read the tests before source. Confirm realistic events use `version: "2.0"`, stage/request IDs, HTTP method, and `rawPath`. Expected behavior:

- live 200 without auth or SSM;
- ready 200 only after stage config is available, otherwise safe 503;
- `/api/hello` 401 without a valid bearer token and 200 with validated identity;
- `/jobs` validates `createJobRequestSchema`, emits a `jobSchema` message, and returns 202;
- malformed body returns 400 before queue send;
- queue failure returns safe 500; and
- logs contain request/stage/cold/status/duration/job correlation but no token, body-only field, parameter value, or exception message.

`POST /jobs` is the Phase 03 producer interface. Do not add a worker, DLQ, redrive policy, or event-source mapping in this phase.

## Part 2 — inspect cache and rotation behavior
`parameters.test.ts` proves:

1. `GetParameters` uses exact stage names and `WithDecryption: true`;
2. repeated warm reads before expiry make one SDK call;
3. a read at expiry fetches and observes the rotated value;
4. `dev` and `stage` caches are independent; and
5. missing/invalid values fail closed without value disclosure.

The map has at most two entries because only `dev` and `stage` are accepted. TTL bounds staleness within a reused environment; environment retirement can discard it earlier. A failed refresh is not cached.

When changing behavior, use one red → green → refactor cycle: add a focused failing test, run that test and confirm the expected assertion failure, implement the smallest change, then run the focused and complete Lambda suite. Configuration/Terraform files are declarative, but handler/cache behavior requires this test-first evidence.

### Checkpoint 1 — local contract
- [ ] Seventeen or more Lambda tests pass.
- [ ] I can identify the production change that would fail each new cache test.
- [ ] No test relies on real AWS credentials.
- [ ] Shared job payload validates through `@aws-course/contracts`.
- **Evidence:** test names/count and a redacted summary of one observed red → green cycle.

## Part 3 — build the deployment artifact
```bash
./scripts/package-lambda.sh
unzip -l artifacts/lambda-api.zip
./scripts/package-lambda.sh
openssl dgst -sha256 -binary artifacts/lambda-api.zip | openssl base64 -A
printf '\n'
```

The package script bundles `index.ts` and dependencies for Node 24 as ESM, includes a source map without embedded source content, fixes timestamps, fixes entry order, and strips extra zip metadata. Repeated source/dependency inputs should produce identical zip bytes and AWS-compatible base64 SHA-256 (`CodeSha256`). The artifact is ignored; do not commit it.

Inspect with `unzip -l`, not by running module initialization without required configuration. Expected entries are `index.mjs` and `index.mjs.map`; no `.env`, PEM, token, Terraform state, or entire repository exists in the zip.

### Checkpoint 2 — artifact evidence
- [ ] Root `npm run check` passes.
- [ ] Two package runs produce the same CodeSha256.
- [ ] Zip entries are minimal and contain no secret/local state.
- [ ] I can explain why commit SHA and content hash are complementary identities.
- **Evidence:** test result, entry names, full source SHA, and artifact CodeSha256; neither is secret.

## Bounded failure lab — invalid ordinary configuration
Time box: 8 minutes. Add a temporary test that passes `PARAMETER_CACHE_TTL_SECONDS=301` and a base path with no leading slash. Predict startup validation naming those fields without echoing values. Run it, observe the failure contract, then remove the temporary test or keep it only if it adds non-duplicate coverage. Re-run the suite and package.

Do not move JWT values back into environment variables to “simplify” the lab. `loadLambdaConfig` explicitly rejects the legacy auth fields.

## Teardown and audit
Cloud resources created: none. Remove generated artifact if desired:

```bash
rm -f artifacts/lambda-api.zip
git status --short
```

Confirm no `.env`, token, PEM, artifact, or generated secret is tracked. Keep source/test changes only.

## Retrieval quiz
1. Which configuration belongs in env versus Parameter Store?
2. Why are SDK clients outside the handler?
3. What exactly bounds cache staleness?
4. What does ready prove that live does not?
5. Why preserve dependency injection?
6. What carries to manual deployment?

<details><summary>Answer key</summary>

1. Non-sensitive names/URLs/TTL versus auth values. 2. Warm reuse and lower per-invocation setup, without assuming durability. 3. TTL per execution environment; concurrency creates independent caches. 4. Required stage auth config can be fetched and validated. 5. Real routing/error behavior can be tested without cloud calls. 6. Tested source, package command, zip hash, event/config/IAM contracts—not a cloud resource.
</details>

## Authoritative references
- [TypeScript Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/lambda-typescript.html) and [Node.js handler best practices](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) — packaging/client reuse; accessed 2026-08-16.
- [Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) and [GetParameters API](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParameters.html) — runtime retrieval; accessed 2026-08-16.
- [Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html) — configuration boundary; accessed 2026-08-16.

## Next lesson
Continue to [Lesson 14](14-manual-lambda-api-then-terraform.md). Keep AWS empty until its safety gate.
