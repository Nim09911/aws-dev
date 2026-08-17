resource "aws_ecs_task_definition" "app" {
  family                   = local.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name       = "ecs-api"
    image      = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
    essential  = true
    privileged = false
    portMappings = [{
      name          = "http"
      containerPort = 3000
      hostPort      = 3000
      protocol      = "tcp"
    }]
    environment = [
      {
        name  = "PORT"
        value = "3000"
      },
      {
        name  = "SERVICE_NAME"
        value = "ecs-api"
      },
      {
        name  = "SERVICE_VERSION"
        value = var.image_tag
      },
      {
        name  = "APP_ENVIRONMENT"
        value = "dev"
      },
      {
        name  = "CORS_ALLOWED_ORIGINS"
        value = join(",", var.cors_allowed_origins)
      },
    ]
    secrets = [
      {
        name      = "JWT_PUBLIC_KEY_BASE64"
        valueFrom = local.parameter_arns[0]
      },
      {
        name      = "JWT_ISSUER"
        valueFrom = local.parameter_arns[1]
      },
      {
        name      = "JWT_AUDIENCE"
        valueFrom = local.parameter_arns[2]
      },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 10
    }
  }])
}

resource "aws_ecs_service" "app" {
  name            = local.service_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
  enable_execute_command             = false

  network_configuration {
    subnets          = [aws_subnet.public.id]
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = true
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    precondition {
      condition     = var.desired_count == 0 || var.image_tag != "0000000000000000000000000000000000000000"
      error_message = "Replace the bootstrap-only zero SHA before setting desired_count to 1."
    }
  }

  depends_on = [aws_route_table_association.public]
}
