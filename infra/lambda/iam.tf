data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.name_prefix}-lambda-execution"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
  description        = "Runtime identity for logs, scoped SSM reads, and source-queue sends."
}

data "aws_iam_policy_document" "execution" {
  statement {
    sid = "WriteOnlyOwnLogStreams"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    sid       = "ReadOnlyRuntimeParameters"
    actions   = ["ssm:GetParameters"]
    resources = local.parameter_arns
  }

  statement {
    sid       = "SendOnlySourceJobs"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.source_jobs.arn]
  }
}

resource "aws_iam_role_policy" "execution" {
  name   = "lambda-runtime"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution.json
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
      values   = ["repo:${var.github_repository}:environment:lambda-deploy"]
    }
  }
}

resource "aws_iam_role" "deployment" {
  name               = "${var.name_prefix}-lambda-deployment"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json
  description        = "GitHub OIDC role restricted to code versions and dev/stage aliases."
}

data "aws_iam_policy_document" "deployment" {
  statement {
    sid = "ReadAndPublishExactFunction"
    actions = [
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:ListVersionsByFunction",
      "lambda:PublishVersion",
      "lambda:UpdateFunctionCode",
    ]
    resources = [aws_lambda_function.api.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }

  statement {
    # GetAlias and UpdateAlias support the unqualified Lambda function
    # resource type, not function-alias ARNs. The workflow validates its
    # target as dev|stage; IAM still confines both actions to this one function.
    sid = "MoveAliasesOnExactFunction"
    actions = [
      "lambda:GetAlias",
      "lambda:UpdateAlias",
    ]
    resources = [aws_lambda_function.api.arn]

    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = [var.aws_region]
    }
  }
}

resource "aws_iam_role_policy" "deployment" {
  name   = "deploy-lambda-api"
  role   = aws_iam_role.deployment.id
  policy = data.aws_iam_policy_document.deployment.json
}
