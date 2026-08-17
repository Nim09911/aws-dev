resource "aws_apigatewayv2_api" "this" {
  name          = "${var.name_prefix}-lambda-api"
  protocol_type = "HTTP"
  description   = "Course HTTP API using explicit dev and stage deployments."

  cors_configuration {
    allow_origins = var.cors_allowed_origins
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000

  # API Gateway substitutes each explicit stage's non-secret alias variable.
  integration_uri = "arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}:lambda:path/2015-03-31/functions/${aws_lambda_function.api.arn}:$${stageVariables.lambda_alias}/invocations"
}

locals {
  routes = toset([
    "GET /health/live",
    "GET /health/ready",
    "GET /api/hello",
    "POST /jobs",
  ])
}

resource "aws_apigatewayv2_route" "lambda" {
  for_each = local.routes

  api_id    = aws_apigatewayv2_api.this.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_deployment" "this" {
  api_id = aws_apigatewayv2_api.this.id

  triggers = {
    redeployment = sha1(jsonencode({
      integration = {
        uri     = aws_apigatewayv2_integration.lambda.integration_uri
        payload = aws_apigatewayv2_integration.lambda.payload_format_version
        timeout = aws_apigatewayv2_integration.lambda.timeout_milliseconds
      }
      routes = {
        for key, route in aws_apigatewayv2_route.lambda :
        key => route.target
      }
      cors = var.cors_allowed_origins
    }))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [aws_apigatewayv2_route.lambda]
}

resource "aws_cloudwatch_log_group" "api_access" {
  for_each = local.stages

  name              = "/aws/apigateway/${local.service_name}/${each.key}"
  retention_in_days = 3
}

resource "aws_apigatewayv2_stage" "this" {
  for_each = local.stages

  api_id        = aws_apigatewayv2_api.this.id
  name          = each.key
  deployment_id = aws_apigatewayv2_deployment.this.id
  auto_deploy   = false

  stage_variables = {
    lambda_alias = each.key
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_access[each.key].arn
    format = jsonencode({
      requestId        = "$context.requestId"
      stage            = "$context.stage"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      integrationError = "$context.integrationErrorMessage"
      responseLatency  = "$context.responseLatency"
    })
  }
}

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.stages

  statement_id  = "AllowApiGateway${title(each.key)}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.stage[each.key].name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.this.execution_arn}/${each.key}/*/*"
}
