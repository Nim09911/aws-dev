output "api_id" {
  value = aws_apigatewayv2_api.this.id
}

output "api_urls" {
  description = "Built-in HTTPS endpoints; no custom domain or Route 53 resource exists."
  value = {
    for stage in local.stages :
    stage => "${aws_apigatewayv2_api.this.api_endpoint}/${stage}"
  }
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "lambda_alias_arns" {
  value = {
    for stage, alias in aws_lambda_alias.stage :
    stage => alias.arn
  }
}

output "source_queue" {
  description = "Producer queue owned by infra/lambda; Phase 03 infra/sqs owns only its consumer side."
  value = {
    name = aws_sqs_queue.source_jobs.name
    arn  = aws_sqs_queue.source_jobs.arn
    url  = aws_sqs_queue.source_jobs.url
  }
}

output "deployment_role_arn" {
  description = "Store as the non-secret GitHub variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deployment.arn
}

output "parameter_names" {
  description = "Names only. Values are externally seeded and absent from Terraform configuration/state."
  value       = local.parameter_names
}

output "artifact_code_sha256" {
  description = "AWS-compatible base64 SHA-256 of the deployed zip."
  value       = filebase64sha256(var.artifact_path)
}

output "cost_warning" {
  value = "Lambda and HTTP API have request/compute charges but no idle minimum. SQS API requests, CloudWatch log ingestion/storage, and applicable data transfer may incur charges; SQS has no separate retained-message storage fee. Verify current prices and destroy the stack."
}
