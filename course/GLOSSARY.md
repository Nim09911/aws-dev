# Course Glossary

These definitions describe how terms are used in this course. They are concise study aids, not substitutes for the current AWS service documentation linked by each lesson.

## A–D

**Access pattern**  
A specific question or operation the application must perform against data, including its key inputs, ordering, filtering, and consistency needs. DynamoDB keys and indexes are designed from access patterns rather than from an entity diagram alone.

**Alias (Lambda)**  
A named pointer to a Lambda function version. An alias can split invocation traffic between versions and is the stable target used by the safe-release lab.

**API Gateway HTTP API**  
The API Gateway v2 product used by this course to expose Lambda handlers over HTTPS. It differs from API Gateway REST API in features, configuration model, and pricing.

**Artifact**  
An immutable deployable output, such as a container image identified by digest or a bundled Lambda zip associated with a source revision.

**At-least-once delivery**  
A delivery model in which a message may be processed more than once. SQS-triggered consumers must tolerate duplicates; successful enqueue does not prove successful processing.

**Availability Zone (AZ)**  
An isolated location within an AWS Region. Subnets belong to exactly one Availability Zone.

**Backpressure**  
The system's response when work arrives faster than consumers can process it. A queue can buffer the difference, but queue age and depth reveal growing delay rather than eliminating capacity limits.

**Blue/green deployment**  
A release strategy with old and new environments available at the same time while traffic moves between them. It can improve rollback safety but may require duplicate, billable capacity.

**Canary deployment**  
A release that sends a small share of traffic to a new version before increasing exposure. The Lambda lab uses versions, an alias, alarms, and rollback.

**CIDR block**  
An IP address range written in Classless Inter-Domain Routing notation, such as `10.0.0.0/16`. VPC and subnet ranges must be planned to avoid invalid overlaps.

**Cold start**  
Initialization work performed when Lambda creates an execution environment before handling an invocation. Not every invocation is a cold start, and environment reuse is not guaranteed.

**Conditional write**  
A DynamoDB write that succeeds only when a condition is true. It is used to prevent silent overwrites and implement optimistic concurrency behavior.

**Container**  
A running process with isolation and configuration created from an image. An image is the artifact; a container is a runtime instance of it.

**Dead-letter queue (DLQ)**  
A queue that receives messages after the source queue's redrive policy exhausts allowed receives. A source-queue DLQ is a separate failure boundary from Lambda asynchronous invocation or EventBridge target failure handling.

**Drift**  
A difference between declared Terraform configuration/state and real infrastructure, often caused by out-of-band changes.

## E–I

**ECS cluster**  
A logical grouping for ECS capacity and services. An empty cluster does not run the application; tasks do.

**ECS service**  
An ECS controller that maintains a desired number of tasks and performs deployments. It is distinct from a task definition and a running task.

**ECS task**  
A running instantiation of an ECS task definition. With Fargate, AWS supplies the underlying compute capacity.

**ECS task definition**  
A versioned specification describing containers, CPU/memory, ports, logging, roles, and configuration for an ECS task.

**Event source mapping**  
A Lambda-managed poller configuration that reads from a source such as SQS and invokes a function with batches. Disabling it stops that source-to-function polling relationship.

**EventBridge event bus**  
A router that receives events and evaluates rules. Rules match event patterns and send matching events to targets.

**Eventual consistency**  
A read model in which a recent successful write may not immediately appear in every read path. The course makes consistency choices explicit instead of assuming all reads are current.

**Execution environment (Lambda)**  
The isolated runtime where Lambda initializes and invokes function code. It may be reused, which makes in-memory caches useful but not durable or globally consistent.

**Execution role (ECS task)**  
The role used by the ECS/Fargate agent for actions such as pulling images, writing configured logs, and retrieving injected parameters. It is not the application's AWS identity.

**Execution role (Lambda)**  
The role assumed by the Lambda service for a function. Its permissions govern AWS API calls made by function code and service integrations on the function's behalf.

**Fargate**  
Serverless compute capacity for containers used by ECS. “Serverless” removes host management, not the need to configure tasks, networking, IAM, scaling, observability, or cost controls.

**GitHub OIDC**  
Federated authentication in which a GitHub Actions job presents a short-lived identity token that AWS validates before allowing role assumption. It replaces stored long-lived AWS keys; it does not remove the need for restricted trust and permissions.

**Global secondary index (GSI)**  
A DynamoDB index with its own partition key and optional sort key, supporting access patterns not served by the base table's primary key.

**IAM permission policy**  
A policy that defines which actions on which resources are allowed or denied for an identity. It answers “what may this session do?”

**IAM role**  
An AWS identity intended to be assumed, producing temporary role-session credentials. A role has both a trust relationship and permission policies.

**IAM trust policy**  
The role policy that defines which principals may assume the role and under what conditions. It answers “who may become this role?”

**Idempotency**  
The property that repeating an operation has the same intended effect as performing it once. In-memory duplicate tracking is not durable across Lambda execution environments.

**Image**  
An immutable, layered container artifact. ECR stores images; ECS task definitions reference them; running tasks create containers from them.

**Internet gateway**  
A horizontally scaled VPC component that enables communication between a VPC and the internet when routing and addressing also permit it. It does not by itself make a resource reachable.

## L–R

**Least privilege**  
Granting only the actions, resources, and conditions required for the task, then narrowing permissions as evidence reveals what is actually needed.

**NAT gateway**  
A managed VPC service commonly used for outbound internet access from private subnets. It has time- and data-based charges and is intentionally avoided in default course labs.

**Network ACL (NACL)**  
A stateless, subnet-level network filter. Security groups are stateful and attached to network interfaces; the two are not interchangeable.

**On-demand capacity (DynamoDB)**  
A request-based DynamoDB capacity mode used for the ephemeral course table. It reduces capacity planning work but does not make requests or storage universally free.

**Parameter Store**  
A Systems Manager capability for hierarchical configuration values. This course uses standard-tier `String` for ordinary settings and `SecureString` for sensitive values, with narrowly scoped access.

**Partial batch response**  
A Lambda SQS response that reports only failed record identifiers so successful records in the same batch do not need to be retried.

**Partition key**  
The primary key component whose value feeds DynamoDB data distribution. High-cardinality key design supports distribution and must also serve named access patterns.

**Public subnet**  
A subnet whose route table has a route to an internet gateway. A workload also needs appropriate addressing and security rules for its intended internet communication.

**Redrive**  
Moving DLQ messages back toward processing after the cause is understood and corrected. Redrive without diagnosis can repeat failures and cost.

**Region**  
A geographic AWS area containing multiple Availability Zones. Course resources stay in one selected Region unless a lesson explicitly says otherwise.

**Resource-based policy**  
A policy attached to a resource that specifies who can access it. Lambda invocation permissions are a course example.

**Route table**  
A set of destination-to-target rules controlling where subnet or gateway traffic is directed.

## S–Z

**Security group**  
A stateful allow-list firewall attached to supported network interfaces or resources. Return traffic for an allowed connection is automatically permitted.

**Shared responsibility model**  
The division of security responsibilities between AWS and the customer. The boundary varies by service; managed services reduce some operational work but do not transfer responsibility for identities, data, configuration, or application code.

**Sort key**  
The optional second component of a DynamoDB composite primary key. Items sharing a partition key form an item collection ordered by sort key.

**Stage (API Gateway)**  
A named deployment context for an API, used in this course for explicit `dev` and `stage` configuration and promotion.

**State (Terraform)**  
Terraform's mapping between configuration and managed real-world objects, including stored resource attributes. State can contain sensitive values even when output is marked sensitive.

**Strongly consistent read**  
A DynamoDB read option that returns the latest successful write for supported read operations, with different capacity and availability considerations from eventually consistent reads.

**Task role (ECS)**  
The IAM role whose credentials are made available to application containers. It governs application AWS API calls and is separate from the task execution role.

**Temporary credentials**  
Time-limited access key ID, secret access key, and session token issued for a role or federated session. They reduce exposure duration but still require careful handling.

**Terraform data source**  
A read-only lookup of information not created as a managed resource by that configuration.

**Terraform provider**  
A plugin that lets Terraform interact with an API. Provider configuration establishes region and authentication context; it is not an AWS resource.

**Terraform resource**  
A configuration block representing an object Terraform creates or manages through a provider.

**Time to live (TTL)**  
A DynamoDB item attribute that marks when an item becomes eligible for asynchronous expiration. Expiration is not immediate and should not be treated as a precise scheduler.

**Visibility timeout**  
The interval during which an SQS message received by a consumer is hidden from other receives. If processing does not complete and delete the message in time, it can become visible again.

**VPC**  
A logically isolated virtual network in one AWS Region. Subnets, routes, gateways, addresses, and network controls determine actual connectivity.

**Warm invocation**  
A Lambda invocation handled by a reused execution environment. Cached memory may remain, but code must not depend on reuse for correctness.

For full lesson order, return to the [syllabus](README.md).
