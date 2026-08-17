# Prerequisites and Workstation Setup

This course assumes you can write and test application code but have not yet built deep operational experience. AWS Certified Cloud Practitioner knowledge is useful context; the labs will turn that vocabulary into deployable systems.

## Expected knowledge

You should be comfortable with:

- TypeScript or modern JavaScript, including modules, async/await, errors, JSON, and package scripts;
- HTTP methods, status codes, headers, request/response bodies, and basic API testing;
- Git branches, commits, pull requests, and reading diffs;
- terminal navigation, environment variables, and process exit codes; and
- basic AWS terms such as Region, Availability Zone, IAM, VPC, EC2, Lambda, and shared responsibility.

You do **not** need prior production experience with Docker, Terraform, GitHub Actions, ECS, API Gateway, SQS, DynamoDB, or EventBridge. Foundation lessons introduce those concepts before they are required.

## Accounts and access

Choose one beginner-safe starting path:

### Path A — Approved sandbox with IAM Identity Center

Ask the sandbox administrator for:

- the AWS access portal start URL and IAM Identity Center Region;
- the learning account name or ID and approved permission-set name;
- permission to use the services introduced by the course; and
- read access to Bills, Cost Explorer, Budgets, and Free Tier usage, or an administrator-owned process that provides equivalent cost visibility and alerts.

Billing access is not implied by ordinary service permissions. The account or organization administrator may need to enable IAM access to billing information and grant explicit billing permissions. Do not broaden the permission set yourself.

Configure the AWS CLI using the browser-based SSO flow:

```bash
aws configure sso --profile aws-dev-learning
aws sso login --profile aws-dev-learning
aws sts get-caller-identity --profile aws-dev-learning
```

Enter the administrator-provided start URL, SSO Region, account, and permission set. Choose the course Region as the default client Region and `json` as the output format. The login command opens a browser and returns temporary credentials to the CLI profile; it does not create a long-lived access key.

Stop if the identity command returns a different account or role than the administrator approved. Verify billing visibility in the Console separately.

Primary setup references:

- [Configure IAM Identity Center authentication with the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [Grant IAM identities access to billing information](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/control-access-billing.html)

### Path B — Personal learning account awaiting guided identity setup

Protect the root user with MFA and use it only for account bootstrap tasks such as securing the account and configuring billing alerts. Do **not** create a root access key or configure root credentials in the AWS CLI.

You may begin Lesson 01 without a working CLI profile. Lessons 01–02 own the guided non-root identity, billing-access, temporary-credential, least-privilege, and GitHub OIDC setup. Until Lesson 01's identity checkpoint passes, do not create application, network, compute, queue, database, or event resources and do not run AWS CLI deployment commands.

For either path, also prepare:

- a dedicated learning AWS account or explicitly approved sandbox, never a production account;
- access to billing alerts through your own identity or the sandbox administrator;
- a GitHub account and repository where Actions can be enabled later; and
- a password manager and MFA for AWS and GitHub.

Never use an employer production account, shared credentials, or a personal account containing resources you cannot safely distinguish from course resources.

Before any billable deployment, complete [Cost Safety](COST_SAFETY.md) and the Lesson 01 identity checkpoint. Budgets and Free Tier alerts are notifications, not spending caps.

## Required local tools

Install supported versions from the official documentation:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/download) with npm
- [Docker Desktop](https://docs.docker.com/desktop/) or a compatible Docker Engine
- [AWS CLI version 2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- [Terraform](https://developer.hashicorp.com/terraform/install)
- an editor with TypeScript, Markdown, JSON, YAML, and Terraform support

Lessons will pin or constrain project dependencies when application work begins. Do not infer a course-wide tool version from an old blog post; verify supported versions against official release and provider documentation.

Verify that commands are available:

```bash
git --version
node --version
npm --version
docker version
aws --version
terraform version
```

## AWS CLI profile

Path A learners use the named IAM Identity Center profile configured above. Path B learners configure the same named-profile convention during Lesson 01. Do not rely on the implicit `default` profile, and never commit files from `~/.aws`.

Choose one AWS Region that supports the services used by the course. Keep it consistent unless a lesson explicitly compares Regions. Export the profile and region only in your local shell:

```bash
export AWS_PROFILE="aws-dev-learning"
export AWS_REGION="us-east-1"
export AWS_DEFAULT_REGION="$AWS_REGION"
```

Confirm identity and configuration before every cloud lab:

```bash
aws sso login --profile "$AWS_PROFILE"
aws sts get-caller-identity --profile "$AWS_PROFILE"
aws configure get region --profile "$AWS_PROFILE"
```

If the approved sandbox uses a different temporary-credential mechanism, follow its documented login command instead of `aws sso login`; preserve the named-profile and identity-verification checks.

Check the account and ARN carefully. Stop if they are not the intended learning account and role. Do not paste the full account ID or temporary credential output into committed notes.

## Course naming and tags

Use a unique, lowercase resource prefix such as `aws-dev-<initials>` and add an environment suffix where supported, for example `aws-dev-nj-dev`.

Apply these tags to every taggable resource:

- `project=aws-developer-course`
- `environment=dev` or the lesson-required environment
- `owner=<your non-sensitive identifier>`
- `managed-by=manual` or `managed-by=terraform`
- `course-lesson=NN`
- `expires-at=<UTC date or timestamp>`

Do not include email addresses, secrets, tokens, customer data, or full account IDs in names or tags.

## Local safety

- Use a password manager and MFA for AWS and GitHub.
- Keep `.env`, Terraform state, plan files, packaged artifacts, and local lab notes containing identifiers out of source control.
- Never print secrets in shell history, application logs, Terraform outputs, workflow logs, screenshots, or quiz evidence.
- Keep Docker running only when needed and verify which architecture you are building for.
- Treat copied commands as code: read them, substitute placeholders deliberately, and confirm profile and Region before execution.

## Readiness check

You are ready for Lesson 01 when all items are true:

- [ ] I am using a dedicated learning or approved sandbox AWS account.
- [ ] Root MFA is enabled for a personal account; I will not use root for course labs.
- [ ] I chose Path A or Path B and understand its boundary.
- [ ] For Path A, `aws configure sso` and SSO login return the approved account and role.
- [ ] For Path A, I can view billing/budgets or know the sandbox administrator's cost-alert process.
- [ ] For Path B, I will create no cloud lab resources until Lesson 01 establishes the non-root identity and billing controls.
- [ ] Git, Node.js/npm, Docker, AWS CLI v2, and Terraform run locally.
- [ ] I selected one supported Region.
- [ ] I selected a unique resource prefix and the standard tag values.
- [ ] I understand that alerts do not stop resources or cap spend.
- [ ] I have opened the [teardown checklist](TEARDOWN_CHECKLIST.md).

Next: follow the [syllabus](README.md) from Lesson 01. Foundations and the ECS Fargate track are authored; later track paths remain reserved until their implementation phase.
