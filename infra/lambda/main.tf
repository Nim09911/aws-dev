data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  service_name = "${var.name_prefix}-lambda-api"
  stages       = toset(["dev", "stage"])
  tags = {
    project       = "aws-developer-course"
    environment   = "dev-stage"
    owner         = var.owner
    managed-by    = "terraform"
    course-lesson = "14"
    expires-at    = var.expires_at
  }
  parameter_names = flatten([
    for stage in local.stages : [
      "${var.jwt_parameter_base_path}/${stage}/jwt-public-key-base64",
      "${var.jwt_parameter_base_path}/${stage}/jwt-issuer",
      "${var.jwt_parameter_base_path}/${stage}/jwt-audience",
    ]
  ])
  parameter_arns = [
    for name in local.parameter_names :
    "arn:${data.aws_partition.current.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${name}"
  ]
}

resource "aws_sqs_queue" "source_jobs" {
  # This root owns only the producer-facing source queue. Phase 03's infra/sqs
  # root will reference it and own the worker, DLQ, redrive policy, and event
  # source mapping. Do not define those consumer resources here.
  name                      = "${var.name_prefix}-source-jobs"
  message_retention_seconds = 86400
  receive_wait_time_seconds = 20
  sqs_managed_sse_enabled   = true
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.service_name}"
  retention_in_days = 3
}

resource "aws_lambda_function" "api" {
  function_name = local.service_name
  description   = "Course-native HTTP API; dev and stage invoke version aliases."
  role          = aws_iam_role.execution.arn
  runtime       = "nodejs24.x"
  architectures = ["x86_64"]
  handler       = "index.handler"

  filename         = var.artifact_path
  source_code_hash = filebase64sha256(var.artifact_path)
  publish          = true

  memory_size                    = 256
  timeout                        = 10
  reserved_concurrent_executions = 2

  environment {
    variables = {
      SERVICE_NAME                = "lambda-api"
      JOB_QUEUE_URL               = aws_sqs_queue.source_jobs.url
      JWT_PARAMETER_BASE_PATH     = var.jwt_parameter_base_path
      PARAMETER_CACHE_TTL_SECONDS = tostring(var.parameter_cache_ttl_seconds)
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.execution,
  ]

  lifecycle {
    # Terraform bootstraps code; the OIDC workflow owns later immutable code
    # versions. Configuration remains visible and Terraform-managed.
    ignore_changes = [source_code_hash]
  }
}

resource "aws_lambda_alias" "stage" {
  for_each = local.stages

  name             = each.key
  description      = "${each.key} promotion pointer; updated by the OIDC workflow."
  function_name    = aws_lambda_function.api.function_name
  function_version = aws_lambda_function.api.version

  lifecycle {
    ignore_changes = [function_version]
  }
}
