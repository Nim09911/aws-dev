output "ecr_repository_url" {
  description = "Push immutable commit-SHA images here."
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "deployment_role_arn" {
  description = "Store as the non-secret GitHub variable AWS_DEPLOY_ROLE_ARN."
  value       = aws_iam_role.deployment.arn
}

output "task_definition_family" {
  value = aws_ecs_task_definition.app.family
}

output "parameter_names" {
  description = "Names only; values are deliberately outside Terraform."
  value       = local.parameter_names
}

output "cost_warning" {
  value = var.desired_count == 0 ? "No Fargate task or task public IPv4 is requested." : "One Fargate task and its public IPv4 can incur charges until desired_count is zero or the stack is destroyed."
}
