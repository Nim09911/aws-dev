data "aws_iam_policy_document" "ecs_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.name_prefix}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_parameters" {
  statement {
    sid       = "ReadOnlyRuntimeParameters"
    actions   = ["ssm:GetParameters"]
    resources = local.parameter_arns
  }
}

resource "aws_iam_role_policy" "execution_parameters" {
  name   = "read-runtime-parameters"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_parameters.json
}

resource "aws_iam_role" "task" {
  name               = "${var.name_prefix}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json
  description        = "Runtime identity; intentionally has no AWS API permissions in this lesson"
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:${var.github_environment}"]
    }
  }
}

resource "aws_iam_role" "deployment" {
  name               = "${var.name_prefix}-ecs-deployment"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
  description        = "GitHub OIDC role restricted to immutable ECS application deployment"
}

data "aws_iam_policy_document" "deployment" {
  statement {
    sid = "PushImages"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [aws_ecr_repository.app.arn]
  }

  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "ReadAndUpdateExactService"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService",
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/${aws_ecs_cluster.this.name}/${local.service_name}"
    ]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }

  statement {
    # ECS DescribeTaskDefinition does not support resource-level permissions.
    sid       = "DescribeTaskDefinition"
    actions   = ["ecs:DescribeTaskDefinition"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }

  statement {
    sid       = "DescribeTasksInExactCluster"
    actions   = ["ecs:DescribeTasks"]
    resources = ["arn:${data.aws_partition.current.partition}:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task/${aws_ecs_cluster.this.name}/*"]
  }

  statement {
    # ECS ListTasks does not support resource-level permissions. The cluster
    # condition limits the otherwise-required wildcard.
    sid       = "ListTasksInExactCluster"
    actions   = ["ecs:ListTasks"]
    resources = ["*"]

    condition {
      test     = "ArnEquals"
      variable = "ecs:cluster"
      values   = [aws_ecs_cluster.this.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }

  statement {
    sid     = "RegisterTaskRevision"
    actions = ["ecs:RegisterTaskDefinition"]
    # Registration authorizes a task definition that does not exist yet, so
    # ECS evaluates this action against Resource "*". Request conditions keep
    # the workflow limited to this course task shape.
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }

    condition {
      test     = "ForAllValues:StringEquals"
      variable = "ecs:compute-compatibility"
      values   = ["FARGATE"]
    }

    condition {
      test     = "Null"
      variable = "ecs:compute-compatibility"
      values   = ["false"]
    }

    condition {
      test     = "StringEquals"
      variable = "ecs:privileged"
      values   = ["false"]
    }

    condition {
      test     = "NumericEquals"
      variable = "ecs:task-cpu"
      values   = ["256"]
    }

    condition {
      test     = "NumericEquals"
      variable = "ecs:task-memory"
      values   = ["512"]
    }
  }

  statement {
    sid       = "PassOnlyCourseTaskRoles"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.execution.arn, aws_iam_role.task.arn]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "deployment" {
  name   = "deploy-ecs-api"
  role   = aws_iam_role.deployment.id
  policy = data.aws_iam_policy_document.deployment.json
}
