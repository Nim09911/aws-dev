# Native Lambda API infrastructure

This local-state Terraform root creates the Phase 02 artifact-based Node.js Lambda API. It intentionally creates no VPC, NAT gateway, Route 53 record, custom domain, provisioned concurrency, custom metric, X-Ray configuration, or Terraform-managed Parameter Store value.

## Ownership boundary

`infra/lambda` owns the HTTP producer and its source queue:

- one versioned Lambda function with `dev` and `stage` aliases;
- one API Gateway HTTP API with explicit `dev` and `stage` stages;
- the function/API access log groups, execution/deployment roles, and invoke permissions; and
- `<prefix>-source-jobs`, including producer `sqs:SendMessage` permission.

Phase 03's future `infra/sqs` root must **reference this queue** and own the worker, DLQ, redrive policy, queue policy changes needed by that consumer, and Lambda event-source mapping. It must not create or import a second source queue. Destroy consumer infrastructure before destroying this producer root. If Phase 03 needs the source queue, keep this root applied or recreate it from its own local state first.

## Configuration and cost boundary

Only ordinary names, URLs, the cache TTL, and artifact metadata enter Lambda environment variables. Runtime auth values live at:

```text
<base>/dev/jwt-public-key-base64   (SecureString)
<base>/dev/jwt-issuer              (String)
<base>/dev/jwt-audience            (String)
<base>/stage/...                   (same three suffixes)
```

The values are seeded with `scripts/seed-lambda-parameters.sh` and never enter Terraform arguments or outputs. The execution role can call only `ssm:GetParameters` for these six exact ARNs, write only its pre-created log group, and send only to the source queue. No `kms:Decrypt` grant is needed when SecureString uses the AWS managed SSM key; using a customer-managed key requires a separately scoped grant.

Lambda and HTTP API do not have an idle minimum charge, but invocations/duration, API requests, SQS API requests, CloudWatch log ingestion/storage, and applicable transfer can be metered. SQS does not separately charge for retained-message storage. Standard parameters currently have no parameter storage charge; advanced parameters and higher-throughput options can cost. Verify current pricing before the lab. Three-day log retention limits persistence; it does not make ingestion free.

## Package, initialize, and plan

```bash
export AWS_PROFILE="aws-dev-learning"
export AWS_REGION="us-east-1"
aws sts get-caller-identity --profile "$AWS_PROFILE"

./scripts/package-lambda.sh
cp infra/lambda/terraform.tfvars.example infra/lambda/terraform.tfvars
# Replace every placeholder and use an absolute artifact_path.

terraform -chdir=infra/lambda init
terraform -chdir=infra/lambda fmt -check
terraform -chdir=infra/lambda validate
terraform -chdir=infra/lambda plan -out=tfplan
```

Review the local plan before any learner-run apply. Confirm two aliases/stages, payload format `2.0`, exact SSM/SQS/log permissions, three-day logs, source queue, and environment-scoped OIDC trust. Local state, tfvars, plans, and generated zip files are ignored and must not be shared.

After an intentional apply, seed both environments and smoke the built-in endpoints:

```bash
./scripts/seed-lambda-parameters.sh dev
./scripts/seed-lambda-parameters.sh stage
terraform -chdir=infra/lambda output -json api_urls
./scripts/smoke-lambda-api.sh "$(terraform -chdir=infra/lambda output -json api_urls | jq -r .dev)"
```

The health script checks reachability/readiness and closed-by-default auth. It does not submit `/jobs`. Authenticated input remains a learner-run test so a token is never placed in workflow logs or shell arguments.

## Stage promotion

The HTTP integration uses a non-secret stage variable to invoke the matching Lambda alias. `dev` and `stage` therefore share routes but have independent immutable version pointers and independent Parameter Store paths. The deployment workflow:

1. tests and deterministically packages the source;
2. computes the AWS-compatible zip hash;
3. reuses an existing function version with that hash and the current Terraform-managed runtime configuration, or publishes it once;
4. moves only the requested `dev` or `stage` alias; and
5. waits for the requested alias configuration and verifies `CodeSha256`.

Promote the same commit by running the workflow for `dev`, recording smoke/log evidence, then rerunning for `stage` with the same commit. Infrastructure remains Terraform-owned; the workflow cannot change routes, IAM, environment variables, parameters, or queues. Terraform bootstraps the initial zip, then ignores function code-hash and alias-pointer drift so a later infrastructure apply does not silently replace delivered code or demote an alias. Runtime configuration remains Terraform-managed; after a configuration change, rerun delivery so the alias moves to a version matching both code and current configuration.

Lambda's `GetAlias` and `UpdateAlias` IAM actions authorize against the
unqualified function resource, not an alias ARN. The policy therefore scopes
those actions to the one exact function; the workflow's validated choice input
limits normal operation to `dev` or `stage`. This is a documented service-level
limit, not a wildcard-resource exception.

## Destroy and independent audit

Disable/restrict the `lambda-deploy` GitHub environment first. If Phase 03 consumer resources exist, destroy its event-source mapping/worker/DLQ before this queue. Then:

```bash
terraform -chdir=infra/lambda plan -destroy
terraform -chdir=infra/lambda destroy
./scripts/delete-lambda-parameters.sh dev
./scripts/delete-lambda-parameters.sh stage
./scripts/audit-lambda-destroy.sh "YOUR_NAME_PREFIX"
```

The function's published versions are deleted with the function. The audit checks matching Lambda, API, log, queue, IAM, and parameter resources without reading values. Also inspect billing after its reporting delay, accidental Regions, local artifacts/state, and GitHub variables/caches. Complete `course/TEARDOWN_CHECKLIST.md`; a successful Terraform destroy alone is insufficient.
